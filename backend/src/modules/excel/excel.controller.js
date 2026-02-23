const ExcelJS = require('exceljs');
const { query } = require('../../config/database');
const path = require('path');

// ── EXPORT MATERIAL REPORT ─────────────────────────────────────────────────
const exportMaterial = async (req, res, next) => {
    try {
        const { date_from, date_to, warehouse_id } = req.query;

        const conditions = ['m.deleted_at IS NULL'];
        const params = [];
        if (warehouse_id) { params.push(warehouse_id); conditions.push(`m.warehouse_id=$${params.length}`); }

        const materials = await query(
            `SELECT m.id, m.code, m.name, m.unit, m.supplier, m.warehouse_location,
        w.name AS warehouse_name
       FROM materials m LEFT JOIN warehouses w ON m.warehouse_id=w.id
       WHERE ${conditions.join(' AND ')} ORDER BY m.code`,
            params
        );

        const wb = new ExcelJS.Workbook();
        wb.creator = 'WMS System';
        wb.created = new Date();

        const ws = wb.addWorksheet('IOS Report Warehouse - Material', {
            views: [{ state: 'frozen', ySplit: 4 }],
        });

        // Title
        ws.mergeCells('A1:N1');
        ws.getCell('A1').value = 'IOS REPORT WAREHOUSE - MATERIAL';
        ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        ws.getRow(1).height = 30;

        ws.mergeCells('A2:N2');
        ws.getCell('A2').value = date_from && date_to ? `Period: ${date_from} ~ ${date_to}` : `Report Date: ${new Date().toLocaleDateString('vi-VN')}`;
        ws.getCell('A2').alignment = { horizontal: 'center' };
        ws.getRow(2).height = 20;

        // Headers
        const headers = [
            { key: 'stt', header: 'STT', width: 6 },
            { key: 'code', header: 'Material Code', width: 16 },
            { key: 'name', header: 'Material Name', width: 32 },
            { key: 'unit', header: 'Unit', width: 8 },
            { key: 'supplier', header: 'Supplier', width: 28 },
            { key: 'warehouse_location', header: 'Location', width: 12 },
            { key: 'opening_stock', header: 'Opening Stock', width: 14 },
            { key: 'total_in', header: 'Total In', width: 12 },
            { key: 'total_out', header: 'Total Out', width: 12 },
            { key: 'closing_stock', header: 'Closing Stock', width: 14 },
            { key: 'warehouse_name', header: 'Warehouse', width: 20 },
        ];

        ws.columns = headers.map(h => ({ key: h.key, width: h.width }));

        const headerRow = ws.getRow(4);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h.header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E75B6' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = {
                top: { style: 'thin' }, bottom: { style: 'thin' },
                left: { style: 'thin' }, right: { style: 'thin' },
            };
        });
        ws.getRow(4).height = 28;

        // Data rows
        for (let i = 0; i < materials.rows.length; i++) {
            const mat = materials.rows[i];

            // Calculate stock for this material within date range
            const dateConditions = ['it.material_id=$1', "it.status='confirmed'", 'it.deleted_at IS NULL'];
            const dateParams = [mat.id];
            if (date_from) { dateParams.push(date_from); dateConditions.push(`it.transaction_date >= $${dateParams.length}`); }
            if (date_to) { dateParams.push(date_to); dateConditions.push(`it.transaction_date <= $${dateParams.length}`); }

            const stockData = await query(
                `SELECT
          COALESCE(SUM(CASE WHEN it.transaction_type='in' THEN it.quantity ELSE 0 END), 0) AS total_in,
          COALESCE(SUM(CASE WHEN it.transaction_type='out' THEN it.quantity ELSE 0 END), 0) AS total_out
         FROM inventory_transactions it WHERE ${dateConditions.join(' AND ')}`,
                dateParams
            );

            const totalIn = parseFloat(stockData.rows[0].total_in);
            const totalOut = parseFloat(stockData.rows[0].total_out);

            const row = ws.addRow({
                stt: i + 1,
                code: mat.code,
                name: mat.name,
                unit: mat.unit,
                supplier: mat.supplier,
                warehouse_location: mat.warehouse_location,
                opening_stock: 0,
                total_in: totalIn,
                total_out: totalOut,
                closing_stock: totalIn - totalOut,
                warehouse_name: mat.warehouse_name,
            });

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                };
                if (i % 2 === 1) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                }
                if (colNumber >= 7) {
                    cell.numFmt = '#,##0.000';
                    cell.alignment = { horizontal: 'right' };
                }
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=IOS_Material_${new Date().toISOString().split('T')[0]}.xlsx`);

        await wb.xlsx.write(res);
        res.end();
    } catch (error) { next(error); }
};

// ── EXPORT FG REPORT ───────────────────────────────────────────────────────
const exportFG = async (req, res, next) => {
    try {
        const { date_from, date_to, warehouse_id, customer } = req.query;

        const conditions = ['fg.deleted_at IS NULL'];
        const params = [];
        if (warehouse_id) { params.push(warehouse_id); conditions.push(`fg.warehouse_id=$${params.length}`); }
        if (customer) { params.push(`%${customer}%`); conditions.push(`fg.customer ILIKE $${params.length}`); }

        const fgProducts = await query(
            `SELECT fg.id, fg.code, fg.name, fg.customer, fg.order_no, fg.size, fg.color, fg.unit,
        w.name AS warehouse_name
       FROM fg_products fg LEFT JOIN warehouses w ON fg.warehouse_id=w.id
       WHERE ${conditions.join(' AND ')} ORDER BY fg.code, fg.order_no, fg.size`,
            params
        );

        const wb = new ExcelJS.Workbook();
        wb.creator = 'WMS System';

        const ws = wb.addWorksheet('IOS Report Warehouse - FG', {
            views: [{ state: 'frozen', ySplit: 4 }],
        });

        ws.mergeCells('A1:M1');
        ws.getCell('A1').value = 'IOS REPORT WAREHOUSE - FINISHED GOODS (FG)';
        ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
        ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        ws.getRow(1).height = 30;

        ws.mergeCells('A2:M2');
        ws.getCell('A2').value = date_from && date_to ? `Period: ${date_from} ~ ${date_to}` : `Report Date: ${new Date().toLocaleDateString('vi-VN')}`;
        ws.getCell('A2').alignment = { horizontal: 'center' };
        ws.getRow(2).height = 20;

        const headers = [
            { key: 'stt', header: 'STT', width: 6 },
            { key: 'code', header: 'FG Code', width: 14 },
            { key: 'name', header: 'FG Name', width: 28 },
            { key: 'customer', header: 'Customer', width: 22 },
            { key: 'order_no', header: 'Order No', width: 16 },
            { key: 'size', header: 'Size', width: 8 },
            { key: 'color', header: 'Color', width: 12 },
            { key: 'opening_stock', header: 'Opening Stock', width: 14 },
            { key: 'production_in', header: 'Production In', width: 14 },
            { key: 'shipment_out', header: 'Shipment Out', width: 14 },
            { key: 'balance_stock', header: 'Balance Stock', width: 14 },
            { key: 'unit', header: 'Unit', width: 8 },
            { key: 'warehouse_name', header: 'Warehouse', width: 20 },
        ];

        ws.columns = headers.map(h => ({ key: h.key, width: h.width }));
        const headerRow = ws.getRow(4);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h.header;
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF217346' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
            cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
        ws.getRow(4).height = 28;

        for (let i = 0; i < fgProducts.rows.length; i++) {
            const fg = fgProducts.rows[i];

            const dateParams = [fg.id];
            const prodConditions = ['pt.fg_product_id=$1', "pt.status='confirmed'", 'pt.deleted_at IS NULL'];
            const shipConditions = ['st.fg_product_id=$1', "st.status='confirmed'", 'st.deleted_at IS NULL'];

            if (date_from) {
                dateParams.push(date_from);
                prodConditions.push(`pt.transaction_date >= $${dateParams.length}`);
                shipConditions.push(`st.transaction_date >= $${dateParams.length}`);
            }
            if (date_to) {
                dateParams.push(date_to);
                prodConditions.push(`pt.transaction_date <= $${dateParams.length}`);
                shipConditions.push(`st.transaction_date <= $${dateParams.length}`);
            }

            const [prodData, shipData] = await Promise.all([
                query(`SELECT COALESCE(SUM(pt.quantity),0) AS total FROM production_transactions pt WHERE ${prodConditions.join(' AND ')}`, dateParams),
                query(`SELECT COALESCE(SUM(st.quantity),0) AS total FROM shipment_transactions st WHERE ${shipConditions.join(' AND ')}`, dateParams),
            ]);

            const productionIn = parseFloat(prodData.rows[0].total);
            const shipmentOut = parseFloat(shipData.rows[0].total);

            const row = ws.addRow({
                stt: i + 1,
                code: fg.code,
                name: fg.name,
                customer: fg.customer,
                order_no: fg.order_no,
                size: fg.size,
                color: fg.color,
                opening_stock: 0,
                production_in: productionIn,
                shipment_out: shipmentOut,
                balance_stock: productionIn - shipmentOut,
                unit: fg.unit,
                warehouse_name: fg.warehouse_name,
            });

            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                    right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
                };
                if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
                if (colNumber >= 8 && colNumber <= 11) {
                    cell.numFmt = '#,##0';
                    cell.alignment = { horizontal: 'right' };
                }
            });
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=IOS_FG_${new Date().toISOString().split('T')[0]}.xlsx`);
        await wb.xlsx.write(res);
        res.end();
    } catch (error) { next(error); }
};

// ── IMPORT MATERIAL ────────────────────────────────────────────────────────
const importMaterial = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng upload file Excel' });

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(req.file.buffer);

        const ws = wb.getWorksheet(1) || wb.worksheets[0];
        if (!ws) return res.status(400).json({ success: false, message: 'File Excel không có dữ liệu (Worksheet không tồn tại)' });

        const imported = [];
        const errors = [];

        let headerRow = null;
        let headerIdx = -1;

        ws.eachRow((row, rowNumber) => {
            const values = row.values.map(v => (v && typeof v === 'object' && v.text ? v.text : String(v || '').trim()));
            if (!headerRow && values.some(v => v.toLowerCase().includes('material code') || v.toLowerCase().includes('code'))) {
                headerRow = values;
                headerIdx = rowNumber;
            }
        });

        if (!headerRow) {
            return res.status(400).json({ success: false, message: 'Không tìm thấy header row trong file Excel' });
        }

        const colMap = {};
        headerRow.forEach((h, i) => {
            const hl = h.toLowerCase();
            if (hl.includes('material code') || (hl.includes('code') && !hl.includes('order'))) colMap.code = i;
            else if (hl.includes('material name') || hl.includes('name')) colMap.name = i;
            else if (hl.includes('unit')) colMap.unit = i;
            else if (hl.includes('supplier')) colMap.supplier = i;
            else if (hl.includes('location')) colMap.location = i;
        });

        ws.eachRow(async (row, rowNumber) => {
            if (rowNumber <= headerIdx) return;
            const vals = row.values;
            const code = String(vals[colMap.code] || '').trim();
            const name = String(vals[colMap.name] || '').trim();
            if (!code || !name) return;

            imported.push({ code, name, unit: String(vals[colMap.unit] || 'KG').trim(), supplier: String(vals[colMap.supplier] || '').trim(), warehouse_location: String(vals[colMap.location] || '').trim() });
        });

        let created = 0, updated = 0;
        for (const item of imported) {
            try {
                const existing = await query('SELECT id FROM materials WHERE code=$1 AND deleted_at IS NULL', [item.code]);
                if (existing.rows.length) {
                    await query('UPDATE materials SET name=$1, unit=$2, supplier=$3, warehouse_location=$4 WHERE code=$5',
                        [item.name, item.unit, item.supplier, item.warehouse_location, item.code]);
                    updated++;
                } else {
                    await query('INSERT INTO materials (code, name, unit, supplier, warehouse_location) VALUES ($1,$2,$3,$4,$5)',
                        [item.code, item.name, item.unit, item.supplier, item.warehouse_location]);
                    created++;
                }
            } catch (e) {
                errors.push({ code: item.code, error: e.message });
            }
        }

        res.json({
            success: true,
            message: `Import thành công: ${created} mới, ${updated} cập nhật, ${errors.length} lỗi`,
            data: { created, updated, errors },
        });
    } catch (error) { next(error); }
};

// ── IMPORT FG ─────────────────────────────────────────────────────────────
const importFG = async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'Vui lòng upload file Excel' });

        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(req.file.buffer);
        const ws = wb.getWorksheet(1) || wb.worksheets[0];
        if (!ws) return res.status(400).json({ success: false, message: 'File Excel không có dữ liệu' });

        const imported = [];

        let headerRow = null;
        let headerIdx = -1;

        ws.eachRow((row, rowNumber) => {
            const values = row.values.map(v => String(v || '').trim());
            if (!headerRow && values.some(v => v.toLowerCase().includes('fg code') || v.toLowerCase().includes('customer'))) {
                headerRow = values;
                headerIdx = rowNumber;
            }
        });

        if (!headerRow) return res.status(400).json({ success: false, message: 'Không tìm thấy header row' });

        const colMap = {};
        headerRow.forEach((h, i) => {
            const hl = h.toLowerCase();
            if (hl.includes('fg code') || (hl === 'code')) colMap.code = i;
            else if (hl.includes('fg name') || hl.includes('name')) colMap.name = i;
            else if (hl.includes('customer')) colMap.customer = i;
            else if (hl.includes('order')) colMap.order_no = i;
            else if (hl === 'size') colMap.size = i;
            else if (hl === 'color') colMap.color = i;
            else if (hl === 'unit') colMap.unit = i;
        });

        ws.eachRow((row, rowNumber) => {
            if (rowNumber <= headerIdx) return;
            const vals = row.values;
            const code = String(vals[colMap.code] || '').trim();
            const name = String(vals[colMap.name] || '').trim();
            if (!code || !name) return;
            imported.push({
                code, name, customer: String(vals[colMap.customer] || '').trim(),
                order_no: String(vals[colMap.order_no] || '').trim(),
                size: String(vals[colMap.size] || '').trim(),
                color: String(vals[colMap.color] || '').trim(),
                unit: String(vals[colMap.unit] || 'PCS').trim(),
            });
        });

        let created = 0, updated = 0, errors = [];
        for (const item of imported) {
            try {
                const existing = await query(
                    'SELECT id FROM fg_products WHERE code=$1 AND order_no=$2 AND size=$3 AND deleted_at IS NULL',
                    [item.code, item.order_no, item.size]
                );
                if (existing.rows.length) {
                    await query('UPDATE fg_products SET name=$1, customer=$2, color=$3, unit=$4 WHERE id=$5',
                        [item.name, item.customer, item.color, item.unit, existing.rows[0].id]);
                    updated++;
                } else {
                    await query('INSERT INTO fg_products (code, name, customer, order_no, size, color, unit) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                        [item.code, item.name, item.customer, item.order_no, item.size, item.color, item.unit]);
                    created++;
                }
            } catch (e) {
                errors.push({ code: item.code, error: e.message });
            }
        }

        res.json({
            success: true,
            message: `Import thành công: ${created} mới, ${updated} cập nhật, ${errors.length} lỗi`,
            data: { created, updated, errors },
        });
    } catch (error) { next(error); }
};

module.exports = { exportMaterial, exportFG, importMaterial, importFG };

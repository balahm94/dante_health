import json
import frappe
from frappe import _


def before_validate(doc, method):
    """
    For items with custom_batch_details:
    1. Create Batch master records (idempotent)
    2. Create / recreate a Serial and Batch Bundle with all batch entries
       so ERPNext's own validation (batch mandatory) always passes.
    """
    for item in doc.items:
        batch_details_str = item.get("custom_batch_details")
        if not batch_details_str:
            continue

        try:
            batch_list = json.loads(batch_details_str)
        except Exception:
            continue

        if not batch_list:
            continue

        # 1. Create Batch master records
        for b in batch_list:
            batch_id = (b.get("batch_id") or "").strip()
            if not batch_id:
                continue
            if not frappe.db.exists("Batch", batch_id):
                frappe.get_doc({
                    "doctype": "Batch",
                    "batch_id": batch_id,
                    "item": item.item_code,
                    "manufacturing_date": b.get("mfg_date"),
                    "expiry_date": b.get("expiry_date"),
                }).insert(ignore_permissions=True)

        # 2. Delete existing draft bundle so we can recreate it fresh
        existing = item.get("serial_and_batch_bundle")
        if existing and frappe.db.exists("Serial and Batch Bundle", existing):
            if frappe.db.get_value("Serial and Batch Bundle", existing, "docstatus") == 0:
                frappe.delete_doc(
                    "Serial and Batch Bundle", existing,
                    ignore_permissions=True, force=True
                )
        item.serial_and_batch_bundle = None

        # 3. Build entries list (skip rows with empty batch_id or 0 qty)
        entries = [
            {
                "batch_no": (b.get("batch_id") or "").strip(),
                "qty": float(b.get("qty") or 0),
                "warehouse": item.warehouse,
                "incoming_rate": float(item.rate or 0),
            }
            for b in batch_list
            if (b.get("batch_id") or "").strip() and float(b.get("qty") or 0) > 0
        ]

        if not entries:
            continue

        # 4. Create the Serial and Batch Bundle
        sbb = frappe.get_doc({
            "doctype": "Serial and Batch Bundle",
            "item_code": item.item_code,
            "warehouse": item.warehouse,
            "voucher_type": "Purchase Receipt",
            "type_of_transaction": "Inward",
            "company": doc.company,
            "posting_date": doc.posting_date,
            "has_batch_no": 1,
            "has_serial_no": 0,
            "entries": entries,
        })
        sbb.insert(ignore_permissions=True)
        item.serial_and_batch_bundle = sbb.name


def before_submit(doc, method):
    """Validate that each multi-batch item's total batch qty equals the row qty."""
    for item in doc.items:
        if not item.get("custom_batch_details"):
            continue

        try:
            batch_list = json.loads(item.custom_batch_details)
        except Exception:
            continue

        if not batch_list:
            continue

        total = sum(float(b.get("qty") or 0) for b in batch_list)
        if abs(total - float(item.qty or 0)) > 0.001:
            frappe.throw(_(
                "Row {0} ({1}): Total batch qty <b>{2}</b> does not match "
                "item qty <b>{3}</b>. Please fix the batch breakdown."
            ).format(item.idx, item.item_code, total, item.qty))

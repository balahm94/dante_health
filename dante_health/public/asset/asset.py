import frappe
from frappe.utils import add_months

# This function name can be anything, but let's be descriptive
def validate_warranty_logic(doc, method):
    # 1. Sync Logic: If Warranty Date is missing, default it to Available Date
    if not doc.custom_warranty_date and doc.available_for_use_date:
        doc.custom_warranty_date = doc.available_for_use_date

    # 2. Calculation Logic: Always recalculate End Date if Start & Period exist
    if doc.custom_warranty_date and doc.custom_warranty_period:
        doc.custom_warranty_end_date = add_months(
            doc.custom_warranty_date, 
            doc.custom_warranty_period
        )
import frappe
from frappe import _
from frappe.utils import today, cint


def validate_coupon_on_invoice(doc, method):

    if not doc.coupon_code:
        return

    validate_coupon_code(doc.coupon_code)


def on_submit_update_coupon(doc, method):

    if doc.coupon_code:
        update_coupon_code_count(doc.coupon_code, "used")


def on_cancel_update_coupon(doc, method):

    if doc.coupon_code:
        update_coupon_code_count(doc.coupon_code, "cancelled")


def validate_coupon_code(coupon_code):
    if not frappe.db.exists("Coupon Code", coupon_code):
        frappe.throw(_("Invalid Coupon Code"))

    coupon = frappe.get_doc("Coupon Code", coupon_code)
    today_date = today()

    if coupon.valid_from and coupon.valid_from > today_date:
        frappe.throw(_("Coupon Code is not active yet"))

    if coupon.valid_upto and coupon.valid_upto < today_date:
        frappe.throw(_("Coupon Code has expired"))

    if coupon.get("enabled") is not None and not coupon.enabled:
        frappe.throw(_("Coupon Code is disabled"))

    return coupon


def update_coupon_code_count(coupon_code, action):

    used_count = cint(
        frappe.db.get_value("Coupon Code", coupon_code, "used") or 0
    )

    if action == "used":
        used_count += 1
    elif action == "cancelled" and used_count > 0:
        used_count -= 1

    frappe.db.set_value(
        "Coupon Code",
        coupon_code,
        "used",
        used_count
    )
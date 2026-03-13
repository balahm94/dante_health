import frappe
from frappe import _
from frappe.utils import formatdate

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def item_with_manufacturer_query(doctype, txt, searchfield, start, page_len, filters):
    # Cast to integers to prevent the LIMIT syntax crash
    start = int(start)
    page_len = int(page_len)

    return frappe.db.sql(f"""
        SELECT 
            i.name as value, 
            CONCAT(
                i.item_name, 
                IF(COUNT(im.manufacturer) > 0, CONCAT(" (Mfg: ", GROUP_CONCAT(im.manufacturer SEPARATOR ", "), ")"), "")
            ) as description
        FROM 
            `tabItem` i
        LEFT JOIN 
            `tabItem Manufacturer` im ON im.item_code = i.name
        WHERE 
            i.disabled = 0 
            AND i.is_purchase_item = 1  -- FIXED COLUMN NAME FOR V15
            AND (i.name LIKE %(txt)s OR i.item_name LIKE %(txt)s)
        GROUP BY 
            i.name
        ORDER BY 
            i.name
        LIMIT {start}, {page_len}
    """, {
        "txt": f"%{txt}%"
    })


def audit_material_request_changes(doc, method):
    if doc.docstatus == 1:
        return

    db_item_count = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabMaterial Request Item`
        WHERE parent = %s
    """, (doc.name,))[0][0]

    if db_item_count > 0 and len(doc.items) < db_item_count:
        frappe.throw(_("Deletion is strictly prohibited. Set Quantity to 0 instead."))


    for row in doc.items:
        if not row.name:
            continue

        db_row = frappe.db.sql("""
            SELECT qty FROM `tabMaterial Request Item`
            WHERE name = %s
        """, (row.name,), as_dict=True)

        if not db_row:
            continue

        db_qty      = float(db_row[0].qty or 0)
        current_qty = float(row.qty or 0)

        if db_qty == current_qty:
            continue

        already_adjusted = frappe.db.sql("""
            SELECT COUNT(*) FROM `tabComment`
            WHERE reference_doctype = 'Material Request'
            AND reference_name = %s
            AND comment_type = 'Edit'
            AND content LIKE %s
        """, (doc.name, f"%Quantity Adjusted%Item: {row.item_code}%"))[0][0]

        if already_adjusted:
            frappe.throw(_(
                "<b>Security Block:</b> Quantity for <b>{0}</b> has already been "
                "adjusted. Only one modification is permitted per audit policy."
            ).format(row.item_code))

        frappe.db.sql("""
            INSERT INTO `tabComment`
                (name, creation, modified, modified_by, owner,
                 docstatus, comment_type,
                 reference_doctype, reference_name, content, published)
            VALUES
                (%s, NOW(), NOW(), %s, %s,
                 0, 'Edit',
                 'Material Request', %s, %s, 0)
        """, (
            frappe.generate_hash(length=10),
            frappe.session.user,
            frappe.session.user,
            doc.name,
            (
                f"<b>Quantity Adjusted</b><br>"
                f"Item: {row.item_code}<br>"
                f"Original Qty: {db_qty}<br>"
                f"New Qty: {current_qty}<br>"
                f"User: {frappe.session.user}"
            )
        ))

        frappe.db.commit()

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def item_query_with_last_grn(doctype, txt, searchfield, start, page_len, filters):
    from frappe.utils import formatdate

    start = int(start)
    page_len = int(page_len)
    search_term = f"%{txt}%"

    items = frappe.db.sql("""
        SELECT name, item_name, item_group
        FROM `tabItem`
        WHERE (name LIKE %s OR item_name LIKE %s)
        AND is_purchase_item = 1
        LIMIT %s, %s
    """, (search_term, search_term, start, page_len), as_dict=1)

    results = []
    for d in items:
        last_pr = frappe.db.sql("""
            SELECT pri.rate, pr.supplier, pr.posting_date
            FROM `tabPurchase Receipt Item` pri
            JOIN `tabPurchase Receipt` pr ON pri.parent = pr.name
            WHERE pri.item_code = %s AND pr.docstatus = 1
            ORDER BY pr.posting_date DESC, pr.creation DESC
            LIMIT 1
        """, (d.name,), as_dict=1)

        if last_pr:
            pr = last_pr[0]

            formatted_date = formatdate(pr.posting_date, "dd-MM-yyyy")

            pr_line = (
                f'<span style="color:#2490EF;font-size:11px;">'
                f'Last PR: &#8377;{pr.rate} &nbsp;|&nbsp; {pr.supplier} &nbsp;|&nbsp; {formatted_date}'
                f'</span>'
            )
        else:
            pr_line = '<span style="color:#8D99A6;font-size:11px;">No previous PR</span>'

        name_group = f'{d.item_name}, {d.item_group}' if d.item_group else d.item_name
        results.append([d.name, f'{name_group}<br>{pr_line}'])

    return results
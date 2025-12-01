import frappe
from frappe.model.document import Document
from frappe.utils import flt

class AssetUpgradeEntry(Document):
    def validate(self):
        self.calculate_totals()

    def calculate_totals(self):
        # Calculate the net financial impact
        total = 0
        for item in self.items:
            if item.status == "Install":
                total += flt(item.cost)
            elif item.status == "Remove":
                total -= flt(item.cost)
        self.total_value_adjustment = total

    def on_submit(self):
        # 1. Handle Inventory (Physical Movement)
        self.process_stock_movements()
        
        # 2. Handle Finance (Asset Value)
        if self.total_value_adjustment != 0:
            self.create_asset_value_adjustment()
        
        # 3. Handle Asset Config (Data Update)
        self.update_asset_master()

    def process_stock_movements(self):
        items_to_issue = []
        items_to_receive = []

        for row in self.items:
            if row.status == "Install":
                items_to_issue.append(row)
            elif row.status == "Remove":
                items_to_receive.append(row)

        # Create 'Material Issue' for Installs (Consumption)
        if items_to_issue:
            se_issue = frappe.new_doc("Stock Entry")
            se_issue.stock_entry_type = "Material Issue"
            se_issue.company = frappe.db.get_value("Asset", self.asset, "company")
            
            for i in items_to_issue:
                se_issue.append("items", {
                    "item_code": i.item_code,
                    "s_warehouse": i.source_warehouse,
                    "qty": 1,
                    "serial_no": i.serial_no,
                    "basic_rate": i.cost,
                    "cost_center": frappe.db.get_value("Asset", self.asset, "cost_center")
                })
            se_issue.insert()
            se_issue.submit()
            frappe.msgprint(f"Consumed new parts via Stock Entry: {se_issue.name}")

        # Create 'Material Receipt' for Removals (Return to Stock)
        if items_to_receive:
            se_receipt = frappe.new_doc("Stock Entry")
            se_receipt.stock_entry_type = "Material Receipt"
            se_receipt.company = frappe.db.get_value("Asset", self.asset, "company")
            
            for r in items_to_receive:
                se_receipt.append("items", {
                    "item_code": r.item_code,
                    "t_warehouse": r.target_warehouse,
                    "qty": 1,
                    "serial_no": r.serial_no,
                    "basic_rate": r.cost
                })
            se_receipt.insert()
            se_receipt.submit()
            frappe.msgprint(f"Returned old parts via Stock Entry: {se_receipt.name}")

    def create_asset_value_adjustment(self):
        current_asset_value = frappe.db.get_value("Asset", self.asset, "gross_purchase_amount")
        new_value = flt(current_asset_value) + flt(self.total_value_adjustment)

        company = frappe.db.get_value("Asset", self.asset, "company")

        difference_account = frappe.db.get_value(
            "Company",
            company,
            "custom_asset_difference_account"
        )

        if not difference_account:
            frappe.throw(
                "Please set <b>Asset Difference Account</b> in Company (custom_asset_difference_account)."
            )

        adj = frappe.new_doc("Asset Value Adjustment")
        adj.asset = self.asset
        adj.date = self.posting_date
        adj.transaction_date = self.posting_date
        adj.company = company
        adj.new_asset_value = new_value
        adj.difference_account = difference_account
        adj.cost_center = frappe.db.get_value("Asset", self.asset, "cost_center")

        adj.insert()
        adj.submit()

        frappe.msgprint(f"Asset Value adjusted by {self.total_value_adjustment}")

    # INDENTATION FIXED HERE
    def update_asset_master(self):
        asset_doc = frappe.get_doc("Asset", self.asset)

        # Allow updating submitted asset record
        asset_doc.flags.ignore_permissions = True
        asset_doc.flags.ignore_validate_update_after_submit = True
        asset_doc.flags.ignore_links = True
        asset_doc.flags.ignore_in_use = True

        for row in self.items:
            if row.status == "Install":
                # Ensure 'custom_installed_items' matches your Asset Child Table field name exactly
                asset_doc.append("custom_installed_items", {
                    "item_code": row.item_code,
                    "item_name": frappe.db.get_value("Item", row.item_code, "item_name"),
                    "serial_no": row.serial_no,
                    "date_installed": self.posting_date,
                    "status": "Installed"
                })

            elif row.status == "Remove":
                found = False
                for comp in asset_doc.custom_installed_items:
                    if (
                        comp.item_code == row.item_code and 
                        comp.serial_no == row.serial_no and
                        comp.status == "Installed"
                    ):
                        comp.status = "Removed"
                        comp.date_removed = self.posting_date
                        found = True
                        break
                
                if not found:
                    frappe.msgprint(
                        f"Warning: Could not find installed component {row.item_code} ({row.serial_no}) "
                        f"on Asset to mark as removed."
                    )

        asset_doc.save(ignore_permissions=True)
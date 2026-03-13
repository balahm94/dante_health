frappe.ui.form.on("Stock Entry", {
    setup(frm) {
        frm.set_query("stock_entry_type", () => ({
            filters: [
                ["Stock Entry Type", "name", "in", ["Material Issue", "Material Receipt", "Material Transfer"]]
            ]
        }));
    }
});

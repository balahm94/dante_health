frappe.ui.form.on("Asset Upgrade Entry", {
	setup(frm) {
		// Filter Active / Submitted Assets
		frm.set_query("asset", () => {
			return {
				filters: {
					status: ["in", ["Submitted", "Partially Depreciated", "Fully Depreciated"]],
				},
			};
		});
	},

	refresh(frm) {
		// Add button only if form is not new and asset is chosen
		if (frm.doc.asset && frm.doc.docstatus === 0) {
			add_fetch_installed_items_button(frm);
		}
	},

	asset(frm) {
		// Refresh the button when asset changes
		if (frm.doc.asset && frm.doc.docstatus === 0) {
			add_fetch_installed_items_button(frm);
		}
	},
});

function add_fetch_installed_items_button(frm) {
	// Ensure Grid is rendered
	let grid = frm.get_field("items").grid;

	// Remove older duplicate buttons
	grid.grid_buttons.find(".fetch-installed-btn").remove();

	// Add new custom button
	$(
		'<button class="btn btn-xs btn-secondary fetch-installed-btn" style="margin-left: 8px;">' +
			"Fetch Installed Components" +
			"</button>"
	)
		.appendTo(grid.grid_buttons)
		.click(() => fetch_installed_components(frm));
}

function fetch_installed_components(frm) {
	if (!frm.doc.asset) {
		frappe.msgprint("Please select an Asset first.");
		return;
	}

	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Asset",
			name: frm.doc.asset,
		},
		callback: function (r) {
			if (!r.message) {
				frappe.msgprint("Could not fetch Asset details.");
				return;
			}

			let installed = r.message.custom_installed_items || [];

			if (installed.length === 0) {
				frappe.msgprint("This Asset has no installed components.");
				return;
			}

			// Clear existing child rows
			frm.clear_table("items");

			// Populate from installed components
			installed.forEach((comp) => {
				if (comp.status === "Installed") {
					let row = frm.add_child("items");
					row.item_code = comp.item_code;
					row.item_name = comp.item_name;
					row.serial_no = comp.serial_no;
					row.cost = comp.cost;
					row.date_installed = comp.date_installed;
					// row.status = "Install"; // Default action for installed components
				}
			});

			frm.refresh_field("items");
			frappe.msgprint("Installed compon   ents loaded into the table.");
		},
	});
}

frappe.ui.form.on("Asset Installed Item", {
	item_code(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		frm.set_query("item_code", "custom_installed_items", function () {
			return {
				filters: {
					is_stock_item: 1,
				},
			};
		});

		if (row.status === "Remove" && frm.doc.asset) {
			frappe.call({
				method: "frappe.client.get",
				args: { doctype: "Asset", name: frm.doc.asset },
				callback(r) {
					if (r.message) {
						let installed = r.message.custom_installed_items || [];
						let exists = installed.some(
							(c) => c.item_code === row.item_code && c.status === "Installed"
						);

						if (!exists) {
							frappe.msgprint(
								__("Warning: Item {0} is not currently installed on Asset {1}", [
									row.item_code,
									frm.doc.asset,
								])
							);
						}
					}
				},
			});
		}
	},
});

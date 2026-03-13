let _inv_cache = {};

frappe.ui.form.on("Material Request", {
    setup(frm) {
        frm.set_query("manufacturer", "items", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            return {
                query: "erpnext.controllers.queries.item_manufacturer_query",
                filters: { item_code: row.item_code }
            };
        });
    },
    refresh(frm) {
        apply_custom_item_query(frm);
        // setTimeout(() => {
        //     (frm.doc.items || []).forEach(row => fetch_and_render(frm, row));
        // }, 500);
    },
    before_workflow_action: function(frm) {
        if (frm.selected_workflow_action === "Send For Approval" || frm.doc.workflow_state === "Pending Approval") {
            
            if (frm.doc.approver) {
                let msg = `Attention @${frm.doc.approver}: This request is assigned to you for approval.`;
                
                frappe.call({
                    method: "frappe.desk.form.utils.add_comment",
                    args: {
                        reference_doctype: frm.doc.doctype,
                        reference_name: frm.doc.name,
                        content: msg,
                        comment_email: frappe.session.user,
                        comment_by: frappe.session.user_fullname
                    },
                    callback: function() {
                        frm.timeline.refresh();
                    }
                });
            }
        }
    },
    after_save(frm) {
        // setTimeout(() => {
        //     (frm.doc.items || []).forEach(row => fetch_and_render(frm, row));
        // }, 800);
    },
    purpose(frm) { apply_custom_item_query(frm); }
});

function apply_custom_item_query(frm) {
    frm.set_query("item_code", "items", function() {
        return {
            query: "dante_health.common_api.item_with_manufacturer_query",
            filters: { is_purchase_item: 1 }
        };
    });
}

// frappe.ui.form.on("Material Request Item", {
//     form_render(frm, cdt, cdn) {
//         fetch_and_render(frm, locals[cdt][cdn]);
//     },
//     item_code(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];
//         clear_row_icon(frm, row);
//         fetch_and_render(frm, row);
//     }
// });

// function fetch_and_render(frm, row) {
//     if (!row || !row.item_code) return;
//     let warehouse = row.warehouse || frm.doc.set_warehouse;
//     if (!warehouse) return;

//     let key = `${row.item_code}::${warehouse}`;
//     if (_inv_cache[key]) {
//         row._inv_key = key;
//         render_row_icon(frm, row);
//         return;
//     }

//     let results = {}, done = 0;
//     [30, 45, 90].forEach(days => {
//         frappe.call({
//             method: "frappe.client.get_list",
//             args: {
//                 doctype: "Stock Ledger Entry",
//                 filters: {
//                     item_code:    row.item_code,
//                     warehouse:    warehouse,
//                     posting_date: [">", frappe.datetime.add_days(frappe.datetime.nowdate(), -days)],
//                     actual_qty:   ["<", 0]
//                 },
//                 fields: ["sum(actual_qty) as consumption"]
//             },
//             callback(r) {
//                 results[days] = Math.abs(r.message?.[0]?.consumption || 0);
//                 if (++done === 3) {
//                     // ADC = Average Daily Consumption over last 30 days
//                     // Suggested Buy = ADC × 30 days supply
//                     let adc = results[30] / 30;
//                     _inv_cache[key] = {
//                         d30: results[30],
//                         d45: results[45],
//                         d90: results[90],
//                         adc: adc,
//                         buy: Math.ceil(adc * 30)
//                     };
//                     row._inv_key = key;
//                     render_row_icon(frm, row);
//                 }
//             }
//         });
//     });
// }

// function render_row_icon(frm, row) {
//     let gr = frm.fields_dict.items.grid.grid_rows_by_docname?.[row.name];
//     if (!gr || !gr.row) return;

//     gr.row.find(".inv-info-btn").remove();

//     let key  = row._inv_key;
//     let data = _inv_cache[key];
//     if (!data) return;

//     let $cell = gr.row.find("[data-fieldname='item_code']").first();
//     if (!$cell.length) return;

//     let color = data.d30 > 0 ? "#28a745" : "#aaa";

//     let $icon = $(`<span class="inv-info-btn" title="Consumption trend" style="
//         position       : absolute;
//         right          : 38px;
//         top            : 50%;
//         transform      : translateY(-50%);
//         display        : inline-flex;
//         align-items    : center;
//         justify-content: center;
//         width          : 15px;
//         height         : 15px;
//         border-radius  : 50%;
//         background     : ${color};
//         color          : white;
//         font-size      : 10px;
//         font-weight    : 700;
//         font-family    : Georgia, serif;
//         cursor         : pointer;
//         box-shadow     : 0 1px 3px rgba(0,0,0,0.25);
//         line-height    : 1;
//         z-index        : 10;
//         pointer-events : all;
//     ">i</span>`);

//     $icon
//         .on("mouseenter", function() {
//             $(this).css("transform", "translateY(-50%) scale(1.25)");
//         })
//         .on("mouseleave", function() {
//             $(this).css("transform", "translateY(-50%) scale(1)");
//         })
//         .on("click", function(e) {
//             e.stopPropagation();
//             e.preventDefault();
//             show_trend_dialog(row.item_code, key, frm, row);
//         });

//     $cell.css("position", "relative");
//     $cell.append($icon);
// }

// function clear_row_icon(frm, row) {
//     let gr = frm.fields_dict.items.grid.grid_rows_by_docname?.[row.name];
//     if (!gr || !gr.row) return;
//     gr.row.find(".inv-info-btn").remove();
// }

// function show_trend_dialog(item_code, cache_key, frm, row) {
//     let data = _inv_cache[cache_key];
//     if (!data) return;

//     let daily30   = (data.d30 / 30).toFixed(1);
//     let daily45   = (data.d45 / 45).toFixed(1);
//     let daily90   = (data.d90 / 90).toFixed(1);
//     let suggested = data.buy;

//     let trend = parseFloat(daily30) > parseFloat(daily90)
//         ? `<span style="color:#e74c3c;font-weight:600;">▲ Increasing</span>`
//         : parseFloat(daily30) < parseFloat(daily90)
//         ? `<span style="color:#27ae60;font-weight:600;">▼ Decreasing</span>`
//         : `<span style="color:#7f8c8d;font-weight:600;">→ Stable</span>`;

//     let max = Math.max(data.d30, data.d45, data.d90) || 1;
//     let bar = v => Math.max(4, Math.round((v / max) * 100));

//     let html = `
//         <style>
//             .inv-dw    { font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; padding:2px 0 }
//             .inv-title { font-size:14px; font-weight:700; color:#1a1a2e; margin-bottom:14px;
//                          padding-bottom:10px; border-bottom:2px solid #f0f0f0 }
//             .inv-row   { display:flex; align-items:center; gap:8px; margin-bottom:10px }
//             .inv-lbl   { font-size:10px; font-weight:700; color:#888; width:52px; flex-shrink:0; line-height:1.3 }
//             .inv-bw    { flex:1; background:#f0f0f0; border-radius:20px; height:26px; overflow:hidden }
//             .inv-bar   { height:100%; border-radius:20px; display:flex; align-items:center;
//                          padding-left:10px; font-size:10px; font-weight:700; color:white; min-width:20px }
//             .inv-num   { font-size:12px; font-weight:700; color:#333; width:36px; text-align:right; flex-shrink:0 }
//             .inv-rate  { font-size:10px; color:#aaa; width:54px; text-align:right; flex-shrink:0 }
//             .inv-hr    { border:none; border-top:1px solid #f0f0f0; margin:12px 0 }
//             .inv-box   { background:linear-gradient(135deg,#f0f4ff,#e8f5e9); border:1px solid #c8d8f0;
//                          border-radius:8px; padding:12px 16px; display:flex;
//                          align-items:center; justify-content:space-between }
//             .inv-tf    { display:flex; align-items:center; justify-content:space-between;
//                          margin-top:10px; font-size:11px; color:#666 }
//         </style>
//         <div class="inv-dw">
//             <div class="inv-title">${item_code}</div>

//             <div class="inv-row">
//                 <div class="inv-lbl"><b>30 Days</b></div>
//                 <div class="inv-bw">
//                     <div class="inv-bar" style="width:${bar(data.d30)}%;
//                         background:linear-gradient(90deg,#28a745,#20c997)">
//                         ${data.d30 || ''}
//                     </div>
//                 </div>
//                 <div class="inv-num">${data.d30}</div>
//                 <div class="inv-rate">${daily30}/day</div>
//             </div>

//             <div class="inv-row">
//                 <div class="inv-lbl"><b>45 Days</b></div>
//                 <div class="inv-bw">
//                     <div class="inv-bar" style="width:${bar(data.d45)}%;
//                         background:linear-gradient(90deg,#fd7e14,#ffc107)">
//                         ${data.d45 || ''}
//                     </div>
//                 </div>
//                 <div class="inv-num">${data.d45}</div>
//                 <div class="inv-rate">${daily45}/day</div>
//             </div>

//             <div class="inv-row">
//                 <div class="inv-lbl"><b>90 Days</b></div>
//                 <div class="inv-bw">
//                     <div class="inv-bar" style="width:${bar(data.d90)}%;
//                         background:linear-gradient(90deg,#6610f2,#6f42c1)">
//                         ${data.d90 || ''}
//                     </div>
//                 </div>
//                 <div class="inv-num">${data.d90}</div>
//                 <div class="inv-rate">${daily90}/day</div>
//             </div>

//             <hr class="inv-hr">

//             <div class="inv-box">
//                 <div>
//                     <div style="font-size:11px;color:#555;font-weight:600">Suggested Buy Qty</div>
//                     <div style="font-size:9px;color:#999;margin-top:3px">
//                         ADC ${data.adc.toFixed(1)}/day × 30 days
//                     </div>
//                 </div>
//                 <div>
//                     <div style="font-size:26px;font-weight:800;color:#4361ee;line-height:1">
//                         ${suggested}
//                     </div>
//                     <div style="font-size:9px;color:#999;text-align:right;margin-top:2px">units</div>
//                 </div>
//             </div>

//             <div class="inv-tf">
//                 <span>Demand trend:</span>${trend}
//             </div>
//         </div>`;

//     let d = new frappe.ui.Dialog({
//         title: "Consumption Trend",
//         size: "small",
//         fields: [{ fieldtype: "HTML", fieldname: "trend_html" }],
//         primary_action_label: "✓ Apply Suggested Qty",
//         primary_action() {
//             frappe.model.set_value(row.doctype, row.name, "qty", suggested);
//             frm.dirty();
//             d.hide();
//         }
//     });

//     d.fields_dict.trend_html.$wrapper.html(html);
//     d.show();

//     setTimeout(() => {
//         d.$wrapper.find(".inv-bar").each(function() {
//             let w = $(this).css("width");
//             $(this).css("width", "0").animate({ width: w }, 500);
//         });
//     }, 80);
// }
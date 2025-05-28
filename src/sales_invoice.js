import http from "k6/http";
import { group, sleep, check } from "k6";
import { getRandomInt } from "../utils.js";

const params = { headers: { "Content-Type": "application/json" } };

export function sales_invoice_list(baseUrl) {
	group("Load Sales Invoice List", function () {
		// This is copied from network tab for realistic file and args.
		let list_args = {
			doctype: "Sales Invoice",
			fields: [
				"`tabSales Invoice`.`name`",
				"`tabSales Invoice`.`owner`",
				"`tabSales Invoice`.`creation`",
				"`tabSales Invoice`.`modified`",
				"`tabSales Invoice`.`modified_by`",
				"`tabSales Invoice`.`_user_tags`",
				"`tabSales Invoice`.`_comments`",
				"`tabSales Invoice`.`_assign`",
				"`tabSales Invoice`.`_liked_by`",
				"`tabSales Invoice`.`docstatus`",
				"`tabSales Invoice`.`idx`",
				"`tabSales Invoice`.`total`",
				"`tabSales Invoice`.`net_total`",
				"`tabSales Invoice`.`total_taxes_and_charges`",
				"`tabSales Invoice`.`grand_total`",
				"`tabSales Invoice`.`rounding_adjustment`",
				"`tabSales Invoice`.`rounded_total`",
				"`tabSales Invoice`.`total_advance`",
				"`tabSales Invoice`.`outstanding_amount`",
				"`tabSales Invoice`.`discount_amount`",
				"`tabSales Invoice`.`total_billing_amount`",
				"`tabSales Invoice`.`paid_amount`",
				"`tabSales Invoice`.`change_amount`",
				"`tabSales Invoice`.`write_off_amount`",
				"`tabSales Invoice`.`status`",
				"`tabSales Invoice`.`customer_name`",
				"`tabSales Invoice`.`customer`",
				"`tabSales Invoice`.`base_grand_total`",
				"`tabSales Invoice`.`due_date`",
				"`tabSales Invoice`.`company`",
				"`tabSales Invoice`.`currency`",
				"`tabSales Invoice`.`is_return`",
				"`tabSales Invoice`.`_seen`",
				"`tabSales Invoice`.`party_account_currency`",
			],
			filters: [],
			order_by: "`tabSales Invoice`.creation desc",
			start: 0,
			page_length: 20,
			view: "List",
			with_comment_count: 1,
		};
		let list_docs = http.post(
			`${baseUrl}/api/method/frappe.desk.reportview.get`,
			JSON.stringify(list_args),
			params
		);
		check(list_docs, { "list - 200 status": (r) => r.status === 200 });
		let count_args = {
			doctype: "Sales Invoice",
			filters: [],
			fields: [],
			distinct: false,
			limit: 1001,
		};
		let count_docs = http.post(
			`${baseUrl}/api/method/frappe.desk.reportview.get_count`,
			JSON.stringify(count_args),
			params
		);
		check(count_docs, { "count - 200 status": (r) => r.status === 200 });
	});
}

export function sales_invoice_create(baseUrl, config) {
	let invoice;
	let warehouse = config.warehouses[(__VU - 1) % config.warehouses.length];
	group("Create a new Sales Invoice", function () {
		let tomorow = new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000);
		let tomorow_str = `${tomorow.getFullYear()}-${
			tomorow.getMonth() + 1
		}-${tomorow.getDate()}`;
		let tmp_name = `"new-sales-invoice-${getRandomInt(0, 10000000)}`;
		let doc = {
			__islocal: 1,
			__unsaved: 1,
			company: config.company,
			customer: config.customers[getRandomInt(0, config.customers.length)],
			due_date: tomorow_str,
			naming_series: "ACC-SINV-.YYYY.-", // default
			name: tmp_name,
			status: "Draft",
			debit_to: "Debtors - TC",
			docstatus: 0,
			doctype: "Sales Invoice",
			items: [],
		};

		for (let i = 0; i < 3; i++) {
			doc.items.push({
				__islocal: 1,
				__unsaved: 1,
				docstatus: 0,
				doctype: "Sales Invoice Item",
				idx: i + 1,
				name: `new-sales-invoice-item-${getRandomInt(0, 100000000)}`,
				parent: tmp_name,
				parentfield: "items",
				parenttype: "Sales Invoice",
				item_code: config.items[getRandomInt(0, config.items.length)],
				qty: 1,
				rate: i + 1,
				uom: "Nos",
				warehouse: warehouse,
				expense_account: "Cost of Goods Sold - TC",
				cost_center: "Main - TC",
				income_account: "Sales - TC",
			});
		}

		let create_si = http.post(
			`${baseUrl}/api/method/frappe.desk.form.save.savedocs`,
			JSON.stringify({ doc: JSON.stringify(doc), action: "Save" }),
			params
		);
		check(create_si, { "create_si - 200 status": (r) => r.status === 200 });
		if (create_si.status != 200) {
			throw new Error("Failed to create sales invoice");
		}

		invoice = JSON.parse(create_si.body)["docs"][0];
		let fetch_si = http.post(
			`${baseUrl}/api/method/frappe.desk.form.load.getdoc`,
			JSON.stringify({ doctype: "Sales Invoice", name: invoice.name }),
			params
		);
		check(fetch_si, { "fetch_si - 200 status": (r) => r.status === 200 });
	});

	return invoice;
}

export function sales_invoice_submit(baseUrl, config, doc) {
	let invoice;

	group("Submit a Sales Invoice", function () {
		let submit_si = http.post(
			`${baseUrl}/api/method/frappe.desk.form.save.savedocs`,
			JSON.stringify({ doc: JSON.stringify(doc), action: "Submit" }),
			params
		);
		check(submit_si, { "submit_si - 200 status": (r) => r.status === 200 });
		if (submit_si.status != 200) {
			throw new Error("Failed to submit sales invoice");
		}
		invoice = JSON.parse(submit_si.body)["docs"][0];
		let fetch_si = http.post(
			`${baseUrl}/api/method/frappe.desk.form.load.getdoc`,
			JSON.stringify({ doctype: "Sales Invoice", name: invoice.name }),
			params
		);
		check(fetch_si, {
			"fetch_si - 200 status and submitted": (r) =>
				r.status === 200 && invoice.docstatus == 1,
		});
	});

	return invoice;
}

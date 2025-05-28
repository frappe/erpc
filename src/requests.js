import http from "k6/http";
import { group, sleep, check } from "k6";
import { getRandomInt } from "../utils.js";

const params = { headers: { "Content-Type": "application/json" } };

function get_doc(baseUrl, doctype, name) {
	let fetch_doc = http.post(
		`${baseUrl}/api/method/frappe.desk.form.load.getdoc`,
		JSON.stringify({ doctype, name }),
		params
	);
	let tests = {};
	tests[`fetch_${doctype.replace(" ", "_").toLowerCase()}`] = (r) => r.status == 200;
	check(fetch_doc, tests);

	if (fetch_doc.status == 200) {
		return JSON.parse(fetch_doc.body)?.docs?.[0];
	}
}

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
		check(list_docs, { list_sales_invoice: (r) => r.status === 200 });
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
		check(count_docs, { count_sales_invoice: (r) => r.status === 200 });
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
		check(create_si, { create_sales_invoice: (r) => r.status === 200 });
		if (create_si.status != 200) {
			throw new Error("Failed to create sales invoice");
		}

		invoice = JSON.parse(create_si.body)["docs"][0];
		get_doc(baseUrl, "Sales Invoice", invoice.name);
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
		check(submit_si, { submit_sales_invoice: (r) => r.status === 200 });
		if (submit_si.status != 200) {
			throw new Error("Failed to submit sales invoice");
		}
		invoice = JSON.parse(submit_si.body)["docs"][0];
		invoice = get_doc(baseUrl, "Sales Invoice", invoice.name);
		check(invoice, { document_is_submitted: (doc) => doc.docstatus == 1 });
	});

	return invoice;
}

export function sales_invoice_payment(baseUrl, config, invoice) {
	group("Create payment for Sales Invoice", function () {
		let generate_payment = http.post(
			`${baseUrl}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`,
			JSON.stringify({
				dt: invoice.doctype,
				dn: invoice.name,
				bank_account: "Cash - TC",
			}),
			params
		);
		check(generate_payment, { generate_payment: (r) => r.status === 200 });
		let payment = JSON.parse(generate_payment.body).message;
		payment.__islocal = 1;
		payment.name = `new-payment-entry-${getRandomInt(0, 1000000)}`;

		sleep(0.5);
		let save_payment = http.post(
			`${baseUrl}/api/method/frappe.desk.form.save.savedocs`,
			JSON.stringify({ doc: JSON.stringify(payment), action: "Save" }),
			params
		);
		check(save_payment, { save_payment: (r) => r.status === 200 });
		payment = JSON.parse(save_payment.body).docs[0];

		sleep(0.5);
		let submit_payment = http.post(
			`${baseUrl}/api/method/frappe.desk.form.save.savedocs`,
			JSON.stringify({ doc: JSON.stringify(payment), action: "Submit" }),
			params
		);
		check(submit_payment, { submit_payment: (r) => r.status === 200 });

		sleep(0.5);
		invoice = get_doc(baseUrl, invoice.doctype, invoice.name);
		check(invoice, { order_status_paid: (doc) => doc.status === "Paid" });
	});
	return invoice;
}

export function deliver_items(baseUrl, config, invoice) {
	group("Create delivery for Sales Invoice", function () {
		let generate_delivery = http.post(
			`${baseUrl}/api/method/frappe.model.mapper.make_mapped_doc`,
			JSON.stringify({
				method: "erpnext.accounts.doctype.sales_invoice.sales_invoice.make_delivery_note",
				source_name: invoice.name,
			}),
			params
		);
		check(generate_delivery, { generate_delivery: (r) => r.status === 200 });
		let delivery = JSON.parse(generate_delivery.body).message;
		delivery.__islocal = 1;
		delivery.name = `new-delivery-note-${getRandomInt(0, 1000000)}`;

		sleep(0.5);
		let save_delivery = http.post(
			`${baseUrl}/api/method/frappe.desk.form.save.savedocs`,
			JSON.stringify({ doc: JSON.stringify(delivery), action: "Save" }),
			params
		);
		check(save_delivery, { save_delivery: (r) => r.status === 200 });
		delivery = JSON.parse(save_delivery.body).docs[0];

		sleep(0.5);
		let submit_delivery = http.post(
			`${baseUrl}/api/method/frappe.desk.form.save.savedocs`,
			JSON.stringify({ doc: JSON.stringify(delivery), action: "Submit" }),
			params
		);
		check(submit_delivery, { submit_delivery: (r) => r.status === 200 });

		sleep(0.5);
		invoice = get_doc(baseUrl, invoice.doctype, invoice.name); // check delivery status
	});
}

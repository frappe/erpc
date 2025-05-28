import http from "k6/http";
import { group, sleep, check } from "k6";

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

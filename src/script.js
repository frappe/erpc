import http from "k6/http";
import { check, sleep } from "k6";
import {
	sales_invoice_create,
	sales_invoice_list,
	sales_invoice_submit,
} from "./sales_invoice.js";

const BASE_URL = "http://erpc.localhost:8000";
const NUM_ITEMS = 10000;
const NUM_WAREHOUSES = 10;
const NUM_CUSTOMERS = 3000 * NUM_WAREHOUSES;
const NUM_USERS = 10 * NUM_WAREHOUSES;
const COMPANY = "The Company";

export const options = {
	vus: NUM_USERS,
};

export function setup() {
	// login every user and remember credentials
	// master data is created by python setup counterpart

	const sids = [];
	Array.from(Array(options.vus).keys())
		.map((i) => `u-${String(i + 1).padStart(4, "0")}@erpc.local`) // TODO: provide list?
		.forEach((username) => {
			let res = http.post(`${BASE_URL}/api/method/login`, { usr: username, pwd: username });
			if (res.status != 200) {
				throw new Error(`User login failed for ${username}`);
			}
			sids.push(res.cookies.sid[0].value);
		});

	const items = Array.from(Array(NUM_ITEMS).keys()).map(
		(i) => `I-${String(i + 1).padStart(6, "0")}`
	);
	const warehouses = Array.from(Array(NUM_WAREHOUSES).keys()).map(
		(i) => `WH-${String(i + 1).padStart(4, "0")}`
	);

	const customers = Array.from(Array(NUM_CUSTOMERS).keys()).map(
		(i) => `C-${String(i + 1).padStart(6, "0")}`
	);
	return { sids, items, warehouses, customers, company: COMPANY };
}

export default function (data) {
	if (data.sids.length != options.vus) {
		console.error("SIDs not available. VU cannot proceed.");
	}
	const jar = http.cookieJar();
	jar.set(BASE_URL, "sid", data.sids[__VU - 1]);

	let pong = http.get(`${BASE_URL}/api/method/ping`);
	check(pong, {
		"ping - 200 status": (r) => r.status === 200,
		"ping - correct cookies": (r) => r.cookies.sid?.[0]?.value == data.sids[__VU - 1],
	});
	sleep(0.1);
	sales_invoice_list(BASE_URL);
	// NOTE: I am assuming API style use case here.
	// For manual entries the think time should be 10-60 seconds at least.
	sleep(1);
	let invoice = sales_invoice_create(BASE_URL, data);
	sleep(1);
	invoice = sales_invoice_submit(BASE_URL, data, invoice);
}

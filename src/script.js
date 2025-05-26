import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://erpc.localhost:8000";
const NUM_USERS = 10;

export function setup() {
	// login every user and remember credentials
	// master data is created by python setup counterpart

	const sids = [];
	Array.from(Array(NUM_USERS).keys())
		.map((i) => `u-${String(i + 1).padStart(4, "0")}@erpc.local`) // TODO: provide list?
		.forEach((username) => {
			let res = http.post(`${BASE_URL}/api/method/login`, { usr: username, pwd: username });
			check(res, {
				"login succesful": (r) => r.status == 200,
				"sid present in response": (r) => r.cookies.sid?.[0]?.value != null,
			});

			sids.push(res.cookies.sid[0].value);
		});
	return sids;
}

export default function (data) {
	if (data.length != NUM_USERS) {
		console.error("SIDs not available. VU cannot proceed.");
	}
	const jar = http.cookieJar();
	jar.set(BASE_URL, "sid", data[__VU - 1]);

	let res = http.get(`${BASE_URL}/api/method/ping`);
	check(res, {
		"status is 200": (r) => r.status === 200,
		"Same cookie is sent back": (r) => r.cookies.sid?.[0]?.value == data[__VU - 1],
	});

	sleep(1);
}

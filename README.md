### ERP-C

TPC-C inspired benchmark and load testing for ERPNext

### Pre-requisites

- ERPNext install with a freshly installed site.
- Grafana K6 - [Installation Guide](https://grafana.com/docs/k6/latest/set-up/install-k6/)
- Basic understanding of how Frappe, ERPNext, and K6 work. 

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app erpc
bench install-app erpc
```

### Usage

We use k6 to generate load. You can read their [documentation](https://grafana.com/docs/k6/latest/get-started/) to get started.

```bash
# Setup dummy master data for load testing
bench --site test_site setup-loadtest-data
# Run the load test with 100 virtual concurent users
k6 run --vus 100 --duration 10m -e BASE_URL=http://sitename:port ./apps/erpc/src/script.js
```

Note: fixture records have hard-coded naming to simplify writing tests without sending too many arguments. We intend to make it flexible over time if required. 

### Tweaking / Extending

If you want to write custom benchmarks, consider forking the repository or creating a new script. 
The goal of this project, as of now, is to just provide the boilerplate required for writing such tests. 

The following variations are worth exploring in the future:

- Realistic think times. This repo has an aggressive high-throughput API ingestion scenario. If your service will only be used by humans, then you can relax the think times.
- Read heavy workloads. This repo has a disproportionately high W:R ratio. Most sites used by end users directly will have 1:10 write-to-read ratio.
- Different modules and doctypes. Currently, we just do sales invoice -> payment -> Delivery simulation. 
- Randomness / Markov modelling on top of end-user traces / complex workflows

### Contributing

We are not accepting direct contributions at this time. You can suggest changes or post queries by creating an issue. 

### License

AGPL-3.0

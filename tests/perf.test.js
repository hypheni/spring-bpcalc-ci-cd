import { check, sleep } from "k6";
import http from "k6/http";

// Export an options object to configure how k6 will behave during test execution.
//
// See https://docs.k6.io/docs/options
//
export let options = {

  // Either specify vus + duration or stages
  // vus: 20,
  // duration: "3m",

  // This stages configuration will ramp to 20 Virtual Users over a minute,
  // maintain those 20 concurrent users for 1 minute
  // then ramp down to 0 over a minute i.e. ramp-up pattern of "load"
  stages: [
    { duration: "20s", target: 10 },            // 1 new vu every 3 seconds
    { duration: "10s", target: 0 }
  ],
  
  // set a threshold at 100 ms request duration for 95th percentile
  // request duration = time spent sending request, waiting for response, and receiving response
  // aka "response time"
  // the test will be marked as failed by threshold if the value is exceeded 
  // i.e. 95% of request duration times should be < 100 ms
 	thresholds: {
    "http_req_duration": ["p(95) < 200"]
  },

  // Don't save the bodies of HTTP responses by default, for improved performance
  // Can be overwritten by setting the `responseType` option to `text` or `binary` for individual requests
  discardResponseBodies: false,
  // overriden below for GET

  ext: {
    loadimpact: {
      // Specify the distribution across load zones
      //
      // See https://docs.k6.io/docs/cloud-execution#section-cloud-execution-options
      //
      distribution: {
        loadZoneLabel1: { loadZone: "amazon:ie:dublin", percent: 100 },

        // Uncomment this and make sure percentage distribution adds up to 100 to use two load zones.
        // loadZoneLabel2: { loadZone: "amazon:us:ashburn", percent: 50 }
      }
    }
  }
};

/**
 * Get a random integer between `min` and `max`.
 * 
 * @param {number} min - min number
 * @param {number} max - max number
 * @return {number} a random integer
 */

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Export a default function - this defines the entry point for your VUs,
// similar to the main() function in many other languages.
export default function() {
 
  // do an initial GET, force response body so that form can be subsequently submited
  let res = http.get("https://spring-bpcalc-lxwpse7yja-ez.a.run.app", {"responseType": "text"});

  // cookies automatically handled i.e. cookies sent by server will be re-presented by the client in all subsequent requests
  // until end of script

  check(res, {
    "is status 200": (r) => r.status === 200
  });

  // now do a POST without breaking CSRF feature of ASP.Net Core i.e. include cookie and matching hidden
  // field from result (__RequestVerificationToken)

  // now POST form with cookie set and hidden field set to anti forgery token etc. 
  // POST with random data to prevent server cached response to POST, discard response body
  res = res.submitForm({
    fields: { systolic: getRandomInt(70, 190), diastolic: getRandomInt(40, 100)} 
  });

  check(res, {
    "is status 200": (r) => r.status === 200
  });

  // "think" for 3 seconds
  sleep(1);
}

// to run on Docker:
// docker pull loadimpact/k6
// docker run -i loadimpact/k6 run - <perf2.js
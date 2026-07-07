/* MeetReady — live swimmer lookup from the USA Swimming public Times API.
 * Runs entirely in the browser: the API sends CORS "access-control-allow-origin: *",
 * so no server, no proxy, no account, no AI, no tokens. Given a USA Swimming Member ID,
 * this pulls the swimmer's best time per event/course (plus the official level USA
 * Swimming assigns each swim) and returns the same shape ui.js/app.js expect. */
(function (root) {
  "use strict";
  var API = "https://times-api.usaswimming.org/swims/TimesSearch";
  var HDRS = {
    "AppName": "DataHub",
    "Usas-Sub-Id": "Anonymous",
    "Device-Id": "cGxhdGZvcm0gLSBcGxhd2ZW5kb3IgLSB1bmtub3duIC0gMTc1MTcyNDAwMDAwMA==",
    "Content-Type": "application/json"
  };
  var STROKE = {FR: "Free", BK: "Back", BR: "Breast", FL: "Fly", IM: "IM"};
  var MONTHS = {January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7,
                August: 8, September: 9, October: 10, November: 11, December: 12,
                Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6, Jul: 7, Aug: 8, Sep: 9,
                Oct: 10, Nov: 11, Dec: 12};
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // "May 9, 2026" -> "2026-05-09" (the shape daysSince()/within() in app.js expect).
  function iso(d) {
    if (!d) return "";
    var m = /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/.exec(String(d).trim());
    if (!m) return String(d);
    var mo = MONTHS[m[1]];
    return mo ? m[3] + "-" + pad(mo) + "-" + pad(parseInt(m[2], 10)) : String(d);
  }
  function ageGroup(age) {
    return age <= 10 ? "10 & Under" : age <= 12 ? "11-12" : age <= 14 ? "13-14"
         : age <= 16 ? "15-16" : age <= 18 ? "17-18" : "Open/Senior";
  }
  // hundredths-of-a-second parser (reuse app.js's if present, else mirror it).
  var cs = (root.SwimLogic && root.SwimLogic.cs) || function (t) {
    t = String(t);
    if (t.indexOf(":") >= 0) { var p = t.split(":"); return parseInt(p[0], 10) * 6000 + Math.round(parseFloat(p[1]) * 100); }
    return Math.round(parseFloat(t) * 100);
  };

  function apiCall(path, body) {
    return fetch(API + path, {
      method: body ? "POST" : "GET", headers: HDRS,
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (!r.ok) throw new Error("USA Swimming API returned " + r.status);
      return r.json();
    });
  }

  // Run fn over items with at most n in flight (polite to the API, still quick).
  function pool(items, n, fn) {
    return new Promise(function (resolve, reject) {
      var out = new Array(items.length), i = 0, active = 0, done = 0;
      function pump() {
        if (done === items.length) return resolve(out);
        while (active < n && i < items.length) {
          (function (idx) {
            active++;
            Promise.resolve(fn(items[idx])).then(function (v) {
              out[idx] = v; active--; done++; pump();
            }, reject);
          })(i++);
        }
      }
      pump();
    });
  }

  // Look up one swimmer by Member ID -> swimmer object in SWIM_DATA shape.
  function lookupOne(entry) {
    var mid = String(entry.memberId || "").trim();
    if (!mid) return Promise.reject(new Error("no Member ID"));
    return apiCall("/GetBestTimesForMember/" + encodeURIComponent(mid)).then(function (events) {
      if (!Array.isArray(events) || !events.length) throw new Error("no times found for this Member ID");
      var combos = {};
      events.forEach(function (e) { combos[e.distance + "|" + e.strokeAbbreviation] = [e.distance, e.strokeAbbreviation]; });
      var list = Object.keys(combos).map(function (k) { return combos[k]; });
      return pool(list, 5, function (c) {
        return apiCall("/BestTimes", {memberId: mid, distance: c[0], strokeAbbreviation: c[1]})
          .then(function (rows) { return rows || []; }, function () { return []; });
      }).then(function (all) {
        var rows = [], age = 0, fullName = null, club = null, lsc = null;
        all.forEach(function (recs) {
          recs.forEach(function (r) {
            age = Math.max(age, r.swimmerAge || 0);
            fullName = fullName || r.fullName; club = club || r.clubName; lsc = lsc || r.lscCode;
            rows.push({
              event: r.distance + " " + (STROKE[r.strokeAbbreviation] || r.strokeAbbreviation),
              course: r.courseCode, time: r.swimTime, cs: cs(r.swimTime),
              standard: r.timeStandard, date: iso(r.swimDate), meet: r.meetName,
              ageAtSwim: r.swimmerAge
            });
          });
        });
        return {
          name: entry.name || fullName || mid, memberId: mid, age: age, ageGroup: ageGroup(age),
          usasBest: rows, nvslBest: [],
          apiName: fullName, apiClub: club, apiLsc: lsc,
          inputClub: (entry.club || "").trim(), inputState: (entry.state || "").trim()
        };
      });
    });
  }

  root.MeetReadyLookup = {
    lookupAll: function (entries) {
      return pool(entries, 2, function (entry) {
        return lookupOne(entry).catch(function (e) {
          return {name: entry.name || entry.memberId || "(unknown)", memberId: entry.memberId,
                  error: e.message, usasBest: [], nvslBest: [],
                  inputClub: (entry.club || "").trim(), inputState: (entry.state || "").trim()};
        });
      }).then(function (swimmers) {
        return {pulledAt: new Date().toLocaleString(), swimmers: swimmers};
      });
    }
  };
})(typeof self !== "undefined" ? self : this);

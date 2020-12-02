// chart setup
Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
Chart.defaults.global.defaultFontColor = '#858796';


var indent = "&nbsp;&nbsp;&nbsp;&nbsp;";
var currentEpoch = Date.now(); // milliseconds
// log format
  // [
  //   {
  //     uuid: string
  //     fname: string
  //     lname: string
  //     username: string
  //     query: string
  //     timestamp: epoch int
  //   },
  //   ...
  // ]


// getLogAjax().then(processLog).then(showSummary);
getLogAjax().then(processLog).then(loadInfo);
function getLogAjax() {
  var promise = new Promise(function(resolve, reject){
    var alertMsg = "Failed to load log, refresh page";
    var xhr = new XMLHttpRequest();
    var status = true;
    xhr.timeout = 2000;  
    xhr.addEventListener("timeout", function(e) {
      alert(alertMsg);
    });
    var url = "https://45.79.148.58/shrewdly-ferocity-trough";
    xhr.open('GET', url);
    xhr.send();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4) {
        if (xhr.status === 200){
          var response = this.responseText;
          resolve(response);
        } else {
          alert(alertMsg);
        }
      }
    }
  });
  return promise;
}
function processLog(rawLog) {
  var jsonLog = convertToJson(rawLog);
  var adjustedLog = addUsernames(jsonLog);
  var cleanedLog = cleanLog(adjustedLog);
  return cleanedLog;
}
function convertToJson(rawLog) {
  // convert string log to json
  return JSON.parse("[" + rawLog.split("}{").join("},{") + "]");
}
function addUsernames(jsonLog) {
  // add username if not present, suffixed with ***
  var adjustedLog = jsonLog;
  for (var user in adjustedLog) {
    var username = adjustedLog[user]["username"];
    if (username === undefined) {
      var fname = adjustedLog[user]["fname"];
      var lname = adjustedLog[user]["lname"] ? adjustedLog[user]["lname"] : "";
      adjustedLog[user]["username"] = fname + lname + "***";
    } 
  }
  return adjustedLog;
}
function cleanLog(adjustedLog) {
  // remove in-progress searches
  var cleanedLog = [];
  var users = getUniqueUsers(adjustedLog);
  var bufferTime = 4000; // milliseconds
  var times = [];
  var requestCharLimit = 35;
  for (var user in users) {
    var requests = getUserRequests(adjustedLog, users[user]);
    var r0 = requests[0];
    for (var request in requests) {
      if (r0 == requests[0] && requests.length == 1 && r0["query"].length < requestCharLimit) {
        cleanedLog.push(r0);
      } else if (r0 != undefined && r0 != requests[request]) {
        var rf = requests[request];
        var timeDiff = rf["timestamp"] - r0["timestamp"];
        var includes = rf["query"].startsWith(r0["query"]);
        var repeat = includes && r0["query"] != "";
        // if not a repeat request, save the previous request
        if (!repeat && r0["query"].length < requestCharLimit) {
          cleanedLog.push(r0);
        }
        // if last request, save, otherwise set rf to r0 to reset
        if (request == (requests.length - 1) && rf["query"].length < requestCharLimit) {
          cleanedLog.push(rf);
        } else {
          r0 = rf;
        }
      }
    }
  }
  // sort requests by time
  cleanedLog.sort(function(a, b) {
    var keyA = Number(a.timestamp);
    var keyB = Number(b.timestamp);
    if (keyA < keyB) return -1;
    if (keyA > keyB) return 1;
    return 0;
  });
  return cleanedLog;
}
function getTotalRequests(log) {
  return log.length;
  // output:
  // int
}
function getUniqueUsers(log) {
  var users = [];
  for (var entry in log) {
    var username = log[entry]["username"];
    if ( !users.includes(username) ) {
      users.push(username);
    }
  }
  return users;
  // output:
  // [ "usernameA", "usernameB", "usernameN" ]
}
function getTotalUsers(log) {
  var users = getUniqueUsers(log);
  return users.length;
  // output:
  // int
}
function getAveRequestsPerUser(log) {
  var totalRequests = getTotalRequests(log);
  var totalUsers = getTotalUsers(log);
  return Math.round( (totalRequests/totalUsers)*10 ) / 10;
  // output:
  // int
}
function getTotalRequestsPerUser(log) {
  var users = getUniqueUsers(log);
  var requestsPerUser = [];
  for (var user in users) {
    requestsPerUser.push({ "username": users[user], "totalRequests": getUserRequestCount(log, users[user]) });
  }
  // sort user metrics by total requests
  requestsPerUser.sort(function(a, b) {
    // var keyA = new Date(a.totalRequests);
    // var keyB = new Date(b.totalRequests);
    var keyA = Number(a.totalRequests);
    var keyB = Number(b.totalRequests);
    if (keyA < keyB) return 1;
    if (keyA > keyB) return -1;
    return 0;
  });
  return requestsPerUser;
  // output:
  // [
  //   {
  //     username: "usernameA",
  //     totalRequests: int
  //   },
  //   ...
  // ]
}
function getUserRequests(log, user) {
  var requests = [];
  for (var entry in log) {
    if (log[entry]["username"] == user) {
      requests.push(log[entry]);
    }
  }
  return requests;
  // output:
  // [ reqObj1, reqObj2, reqObjN ]
}
function getUserRequestCount(log, user) {
  return getUserRequests(log, user).length;
  // output:
  // int
}
function getTotalRequestsPerUserSummary(log) {
  var requestsPerUserSummary = "";
  var requestsPerUser = getTotalRequestsPerUser(log);
  for (var user in requestsPerUser) {
    requestsPerUserSummary += `<br>${indent}` + requestsPerUser[user]["username"] + ": " + requestsPerUser[user]["totalRequests"];
  }
  return requestsPerUserSummary;
  // output:
  // usernameA: numA
  // usernameB: numB
  // usernameN: numN
}
function getMostActiveUsers(log, num) {
  var totalUsers = getTotalUsers(log)
  var usersRank = getTotalRequestsPerUser(log);
  var mostActiveUsers;
  if (num < totalUsers) {
    mostActiveUsers = usersRank.slice(0, num);
  } else {
    mostActiveUsers = usersRank;
  }
  return mostActiveUsers;
  // output:
  // [
  //   {
  //     username: "usernameA",
  //     totalRequests: int
  //   },
  //   ...
  // ]
}
function getMostActiveUsersSummary(log, num) {
  var mostActiveUsers = getMostActiveUsers(num);
  var mostActiveUsersSummary = "";
  for (var user in mostActiveUsers) {
    mostActiveUsersSummary += "<br>" + indent + mostActiveUsers[user]["username"] + ": " + mostActiveUsers[user]["totalRequests"];
  }
  return mostActiveUsersSummary;
  // output
  // usernameA: numA
  // usernameB: numB
  // usernameN: numN
}
function getUniqueRequests(log) {
  var requests = [];
  for (var entry in log) {
    var request = log[entry]["query"];
    if ( !requests.includes(request) ) {
      requests.push(request);
    }
  }
  return requests;
  // output:
  // [ "reqA", "reqB", "reqN" ]
}
function getRequestFrequency(log, request) {
  var requestFrequency = 0;
  for (var entry in log) {
    if ( request == log[entry]["query"] ) {
      requestFrequency++;
    }
  }
  return requestFrequency;
  // output:
  // int
}
function getRequestRank(log) {
  var requests = getUniqueRequests(log);
  var requestRank = [];
  for (var request in requests) {
    requestRank.push({ "request": requests[request], "frequency": getRequestFrequency(log, requests[request]) });
  }
  // sort requests by frequency
  requestRank.sort(function(a, b) {
    // var keyA = new Date(a.frequency);
    // var keyB = new Date(b.frequency);
    var keyA = Number(a.frequency);
    var keyB = Number(b.frequency);
    if (keyA < keyB) return 1;
    if (keyA > keyB) return -1;
    return 0;
  });
  return requestRank;
  // output:
  // [
  //   {
  //     request: "reqA",
  //     frequency: int
  //   },
  //   ...
  // ]
}
function getMostCommonRequests(log, num) {
  var requestRank = getRequestRank(log);
  var totalRequests = requestRank.length;
  var mostCommonRequests;
  if (num < totalRequests) {
    mostCommonRequests = requestRank.slice(0, num);
  } else {
    mostCommonRequests = requestRank;
  }
  return mostCommonRequests;
  // output:
  // [
  //   {
  //     request: "reqA",
  //     frequency: int
  //   },
  //   ...
  // ]
}
function getMostCommonRequestsSummary(log, num) {
  var requestRank = getMostCommonRequests(log, num);
  var mostCommonRequestsSummary = "";
  for (var request in requestRank) {
    mostCommonRequestsSummary += "<br>" + indent + requestRank[request]["request"] + ": " + requestRank[request]["frequency"];
  }
  return mostCommonRequestsSummary;
  // output
  // requestA: numA
  // requestB: numB
  // requestN: numN
}
function getAveRequestsPerDay(log) {
  var totalRequests = getTotalRequests(log);
  var timeStart = log[0]["timestamp"];
  var timeEnd = log[totalRequests - 1]["timestamp"];
  var timeDelta = timeEnd - timeStart;
  var days = timeDelta / 86400000;
  var aveRequestsPerDay = Math.round( (totalRequests / days) * 10 ) / 10;
  return aveRequestsPerDay;
  // output:
  // int
}
function getNewUsers(log, days) {
  var d = new Date(); // Thu Apr 09 2020 14:28:32 GMT+0100 (British Summer Time)
  d.setDate(d.getDate() - days); // Set it to N days ago
  d.setHours(0, 0, 0); // Zero the hours
  d.setMilliseconds(0); // Zero the milliseconds
  var cutoff = d.getTime(); // Unix timestamp in milliseconds
  var outOfRange = []; // Requests before the cutoff time
  var inRange = []; // Requests after the cutoff time
  for (var entry in log) {
    var timestamp = log[entry]["timestamp"];
    if (timestamp < cutoff) {
      outOfRange.push(log[entry]);
    } else {
      inRange.push(log[entry]);
    }
  }
  var outofRangeUsers = getUniqueUsers(outOfRange);
  var inRangeUsers = getUniqueUsers(inRange);
  var newUsers = [];
  for (var user in inRangeUsers) {
    var username = inRangeUsers[user];
    if ( !outofRangeUsers.includes(username) ) {
      newUsers.push(username);
    }
  }
  return newUsers;
  // output:
  // [ "usernameA", "usernameB", "usernameN" ]
}

function generateTopUsersTable(log, num) {
  var num = (num === undefined) ? getTotalUsers(log) : num;
  var labels = "<tr><th>Username</th><th>Requests</th></tr>";
  var thead = "<thead>" + labels + "</thead>";
  var tfoot = "<tfoot>" + labels + "</tfoot>";
  var topUsers = getMostActiveUsers(log, num);
  var tbody = "<tbody>";
  for (var user in topUsers) {
    tbody += "<tr><td id='" + topUsers[user]["username"] + "'>" + topUsers[user]["username"] + "</td><td>" + topUsers[user]["totalRequests"] + "</td></tr>";
  }
  tbody += "</tbody>";
  var table = thead + tfoot + tbody;
  return table;
  // output:
    // <thead>
    //   <tr>
    //     <th>Username</th>
    //     <th>Requests</th>
    //   </tr>
    // </thead>
    // <tfoot>
    //   <tr>
    //     <th>Username</th>
    //     <th>Requests</th>
    //   </tr>
    // </tfoot>
    // <tbody>
    //   <tr>
    //     <td>hanniabu</td>
    //     <td>6</td>
    //   </tr>
    // </tbody>
}
function generateTopRequestsTable(log, num) {
  var num = (num === undefined) ? getUniqueRequests(log).length : num;
  var labels = "<tr><th>Request</th><th>Count</th></tr>";
  var thead = "<thead>" + labels + "</thead>";
  var tfoot = "<tfoot>" + labels + "</tfoot>";
  var topRequests = getMostCommonRequests(log, num);
  var tbody = "<tbody>";
  for (var request in topRequests) {
    tbody += "<tr><td>" + topRequests[request]["request"] + "</td><td>" + topRequests[request]["frequency"] + "</td></tr>";
  }
  tbody += "</tbody>";
  var table = thead + tfoot + tbody;
  return table;
  // output:
    // <thead>
    //   <tr>
    //     <th>Request</th>
    //     <th>Count</th>
    //   </tr>
    // </thead>
    // <tfoot>
    //   <tr>
    //     <th>Request</th>
    //     <th>Count</th>
    //   </tr>
    // </tfoot>
    // <tbody>
    //   <tr>
    //     <td>hanniabu</td>
    //     <td>6</td>
    //   </tr>
    // </tbody>
}
function generateNewUsersTable(log, days) {
  var num = (num === undefined) ? getUniqueRequests(log).length : num;
  var labels = "<tr><th>Username</th><th>Telegram</th></tr>";
  var thead = "<thead>" + labels + "</thead>";
  var tfoot = "<tfoot>" + labels + "</tfoot>";
  var newUsers = getNewUsers(log, days).reverse();
  var tbody = "<tbody>";
  for (var user in newUsers) {
    // links to top users table to view request count
    var username = "<td><a href='#" + newUsers[user] + "'>" + newUsers[user] + "</a></td>";
    // links to telegram dm to view chats in common
    var link = "<td><a href='https://t.me/" + newUsers[user] + "'>Link</a></td>";
    tbody += "<tr>" + username + link + "</tr>";
  }
  tbody += "</tbody>";
  var table = thead + tfoot + tbody;
  return table;
  // output:
    // <thead>
    //   <tr>
    //     <th>Username</th>
    //   </tr>
    // </thead>
    // <tfoot>
    //   <tr>
    //     <th>Username</th>
    //   </tr>
    // </tfoot>
    // <tbody>
    //   <tr>
    //     <td>hanniabu</td>
    //   </tr>
    // </tbody>
}
function generateRecentRequestsTable(log, num) {
  var num = (num === undefined) ? 25 : num;
  var labels = "<tr><th>Datetime</th><th>Username</th><th>Request</th></tr>";
  var thead = "<thead>" + labels + "</thead>";
  var tfoot = "<tfoot>" + labels + "</tfoot>";
  var tbody = "<tbody>";
  log.reverse();
  log.slice(0, num);
  for (var entry in log) {
    var d = new Date(log[entry]["timestamp"]); // Thu Apr 09 2020 14:28:32 GMT+0100 (British Summer Time)
    var month = d.getMonth() + 1;
    var day = d.getDate();
    var year = d.getFullYear().toString().substr(-2);
    var hours = d.getHours() < 10 ? "0" + d.getHours() : d.getHours();
    var minutes = d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes();
    var datetime = month + "/" + day + "/" + year + " " + hours + ":" + minutes;
    tbody += "<tr><td>" + datetime + "</td><td>" + log[entry]["username"] + "</td><td>" + log[entry]["query"] + "</td></tr>";
  }
  tbody += "</tbody>";
  var table = thead + tfoot + tbody;
  return table;
  // output:
    // <thead>
    //   <tr>
    //     <th>Username</th>
    //     <th>Request</th>
    //     <th>Date</th>
    //   </tr>
    // </thead>
    // <tfoot>
    //   <tr>
    //     <th>Username</th>
    //     <th>Request</th>
    //     <th>Date</th>
    //   </tr>
    // </tfoot>
    // <tbody>
    //   <tr>
    //     <td>hanniabu</td>
    //     <td>eth</td>
    //     <td>11/23/20 13:40</td>
    //   </tr>
    // </tbody>
}
function getDailyRequestData(log) {
  var dates = [];
  var count = [];
  var tally = {};
  for (var entry in log) {
    var timestamp = log[entry]["timestamp"];
    var datetime = new Date(timestamp); // Thu Apr 09 2020 14:28:32 GMT+0100 (British Summer Time)
    var year = datetime.getFullYear(); // 2020
    var month = datetime.getMonth() + 1; // 4 (note zero index: Jan = 0, Dec = 11)
    var day = datetime.getDate(); // 9
    var date = month + "/" + day;
    if ( !dates.includes(date) ) {
      dates.push(date);
      tally[date] = 1;
    }
    tally[date]++;
  }
  for (var date in dates) {
    var key = dates[date];
    count.push(tally[key]);
  }
  return [dates, count];
}
function getCumulativeRequestData(log) {
  var data = getDailyRequestData(log);
  var dates = data[0];
  var count = data[1];
  var tally = 0;
  for (var num in count) {
    tally += count[num];
    count[num] = tally;
  }
  return [dates, count];
}

function loadInfo(log) {
  var totalRequests = getTotalRequests(log);
  var totalUsers = getTotalUsers(log);
  var aveRequestsPerUser = getAveRequestsPerUser(log);
  var aveRequestsPerDay = getAveRequestsPerDay(log);
  var dailyRequestData = getDailyRequestData(log);
  var cumulativeRequestData = getCumulativeRequestData(log);
  var topUsersTable = generateTopUsersTable(log);
  var topRequestsTable = generateTopRequestsTable(log);
  var newUsersTable = generateNewUsersTable(log, 7)
  var recentRequestsTable = generateRecentRequestsTable(log, 25)
  document.getElementById("uniqueUsers").innerHTML = totalUsers;
  document.getElementById("totalRequests").innerHTML = totalRequests;
  document.getElementById("aveRequestsPerUser").innerHTML = aveRequestsPerUser;
  document.getElementById("aveRequestsPerDay").innerHTML = aveRequestsPerDay;
  document.getElementById("topUsersTable").innerHTML = topUsersTable;
  document.getElementById("topRequestsTable").innerHTML = topRequestsTable;
  document.getElementById("newUsersTable").innerHTML = newUsersTable;
  document.getElementById("recentRequestsTable").innerHTML = recentRequestsTable;
  loadDailyRequestChart(dailyRequestData);
  loadCumulativeRequestChart(cumulativeRequestData);
}
function loadDailyRequestChart(data) {
  // var dates = ["10/23", "10/25", "10/27", "10/28", "10/30", "11/2", "11/3", "11/4", "11/5", "10/24", "10/26", "10/29", "10/31", "11/1"];
  // var count = [29, 9, 39, 19, 45, 23, 41, 46, 39, 8, 3, 28, 7, 18];
  var dates = data[0];
  var count = data[1];
  var ctx = document.getElementById("dailyRequestsChart");
  var dailyRequestsChart = new Chart(ctx, {
    type: 'line',
    data: {
      // labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: dates,
      datasets: [{
        label: "Requests",
        lineTension: 0.3,
        backgroundColor: "rgba(78, 115, 223, 0.05)",
        borderColor: "rgba(78, 115, 223, 1)",
        pointRadius: 3,
        pointBackgroundColor: "rgba(78, 115, 223, 1)",
        pointBorderColor: "rgba(78, 115, 223, 1)",
        pointHoverRadius: 3,
        pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
        pointHoverBorderColor: "rgba(78, 115, 223, 1)",
        pointHitRadius: 10,
        pointBorderWidth: 2,
        data: [0, 10000, 5000, 15000, 10000, 20000, 15000, 25000, 20000, 30000, 25000, 40000],
        data: count,
      }],
    },
    options: {
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 25,
          top: 25,
          bottom: 0
        }
      },
      scales: {
        xAxes: [{
          time: {
            unit: 'date'
          },
          gridLines: {
            display: false,
            drawBorder: false
          },
          ticks: {
            maxTicksLimit: 7
          }
        }],
        yAxes: [{
          ticks: {
            maxTicksLimit: 5,
            padding: 10,
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return value;
            }
          },
          gridLines: {
            color: "rgb(234, 236, 244)",
            zeroLineColor: "rgb(234, 236, 244)",
            drawBorder: false,
            borderDash: [2],
            zeroLineBorderDash: [2]
          }
        }],
      },
      legend: {
        display: false
      },
      tooltips: {
        backgroundColor: "rgb(255,255,255)",
        bodyFontColor: "#858796",
        titleMarginBottom: 10,
        titleFontColor: '#6e707e',
        titleFontSize: 14,
        borderColor: '#dddfeb',
        borderWidth: 1,
        xPadding: 15,
        yPadding: 15,
        displayColors: false,
        intersect: false,
        mode: 'index',
        caretPadding: 10,
        callbacks: {
          label: function(tooltipItem, chart) {
            var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
            return datasetLabel + ': ' + tooltipItem.yLabel;
          }
        }
      }
    }
  });
}
function loadCumulativeRequestChart(data) {
  // var dates = ["10/23", "10/25", "10/27", "10/28", "10/30", "11/2", "11/3", "11/4", "11/5", "10/24", "10/26", "10/29", "10/31", "11/1"];
  // var count = [29, 9, 39, 19, 45, 23, 41, 46, 39, 8, 3, 28, 7, 18];
  var dates = data[0];
  var count = data[1];
  var ctx = document.getElementById("cumulativeRequestsChart");
  var dailyRequestsChart = new Chart(ctx, {
    type: 'line',
    data: {
      // labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      labels: dates,
      datasets: [{
        label: "Requests",
        lineTension: 0.3,
        backgroundColor: "rgba(78, 115, 223, 0.05)",
        borderColor: "rgba(78, 115, 223, 1)",
        pointRadius: 3,
        pointBackgroundColor: "rgba(78, 115, 223, 1)",
        pointBorderColor: "rgba(78, 115, 223, 1)",
        pointHoverRadius: 3,
        pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
        pointHoverBorderColor: "rgba(78, 115, 223, 1)",
        pointHitRadius: 10,
        pointBorderWidth: 2,
        data: [0, 10000, 5000, 15000, 10000, 20000, 15000, 25000, 20000, 30000, 25000, 40000],
        data: count,
      }],
    },
    options: {
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 25,
          top: 25,
          bottom: 0
        }
      },
      scales: {
        xAxes: [{
          time: {
            unit: 'date'
          },
          gridLines: {
            display: false,
            drawBorder: false
          },
          ticks: {
            maxTicksLimit: 7
          }
        }],
        yAxes: [{
          ticks: {
            maxTicksLimit: 5,
            padding: 10,
            // Include a dollar sign in the ticks
            callback: function(value, index, values) {
              return value;
            }
          },
          gridLines: {
            color: "rgb(234, 236, 244)",
            zeroLineColor: "rgb(234, 236, 244)",
            drawBorder: false,
            borderDash: [2],
            zeroLineBorderDash: [2]
          }
        }],
      },
      legend: {
        display: false
      },
      tooltips: {
        backgroundColor: "rgb(255,255,255)",
        bodyFontColor: "#858796",
        titleMarginBottom: 10,
        titleFontColor: '#6e707e',
        titleFontSize: 14,
        borderColor: '#dddfeb',
        borderWidth: 1,
        xPadding: 15,
        yPadding: 15,
        displayColors: false,
        intersect: false,
        mode: 'index',
        caretPadding: 10,
        callbacks: {
          label: function(tooltipItem, chart) {
            var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
            return datasetLabel + ': ' + tooltipItem.yLabel;
          }
        }
      }
    }
  });
}
function getReadableLog(log) {
  var readableLog = "";
  for (var entry in log) {
    readableLog += `
      <br>${indent} ${entry}. (${log[entry]["timestamp"]}) ${log[entry]["username"]} - ${log[entry]["query"]}`;
  }
  // output:
  // (timestampA) usernameA - queryA
  // (timestampB) usernameB - queryB
  // (timestampN) usernameN - queryN
  return readableLog;
    // log format
    //   [
    //     {
    //       uuid: string
    //       fname: string
    //       lname: string
    //       username: string
    //       query: string
    //       timestamp: epoch int
    //     },
    //     ...
    //   ]
}
function generateSummary(log) {
  var now = new Date(currentEpoch);
  var date = (now.getMonth() + 1) + "/" + now.getDate() + "/" + now.getFullYear();
  var totalRequests = getTotalRequests(log);
  var totalUsers = getTotalUsers(log);
  var aveRequestsPerUser = getAveRequestsPerUser(log);
  var totalRequestsPerUser = getTotalRequestsPerUserSummary(log);
  var mostActiveUsers = getMostActiveUsersSummary(log, 5);
  var mostCommonRequests = getMostCommonRequestsSummary(log, 10)
  var allRequests = getReadableLog(log);
  var aveRequestsPerDay = getAveRequestsPerDay(log);
  var summary = `
  <strong>${date}</strong>
  <br>Total Requests: ${totalRequests}
  <br>Unique Users: ${totalUsers}
  <br>Ave. Searches Per User: ${aveRequestsPerUser}
  <br>Ave. Searches Per Day: ${aveRequestsPerDay}
  <br>Total Searches Per User: ${totalRequestsPerUser}
  <br>Most Common Requests: ${mostCommonRequests}
  <br><br>All Requests: ${allRequests}
  `;
  // <br>Most Active Users: ${mostActiveUsers}
  // percent unique users in last week
  return summary;
}
function showSummary(log) {
  var summary = generateSummary(log);
  document.body.innerHTML = summary;
}

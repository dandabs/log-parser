// server.js
// where your node app starts

// init project
const gunzip = require("gunzip-file"),
 fs = require("fs"),
  util = require("util"),
  stream = require("stream"),
  es = require("event-stream"),
 path = require("path"),
 request = require("request"),
 cheerio = require("cheerio"),

 express = require("express"),
 fileUpload = require("express-fileupload"),
 app = express();
let lineNr = 0;

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

function randomString(length, chars) {
  var result = "";
  for (var i = length; i > 0; --i)
    result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

app.use(express.static("public"));
app.use(fileUpload());

app.use(function(req,res,next){
  res.set({
    'x-powered-by': 'power',
    'server': 'nginx/1.7.10'
  });
  next();
});

app.get("/", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/upload", function(request, response) {
  response.sendFile(__dirname + "/views/upload.html");
});

app.get("/upload", function(request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/indexedlogs", function(request, response) {
  response.sendFile(__dirname + "/indexedLogs.json");
});

var sourceFile = require("./sourceFile");

global.availfiles = "";

var oof = "";

function addFile(file) {
  oof += "" + file;
}

function getFile() {
  return oof;
}

app.get("/searchlogs", function(req, res) {
  global.availfiles = "";
  const username = req.query.username;
  const directoryPath = path.join("./logs");

  //global.index = [];

  //global.index.push(username);

  fs.readdir(directoryPath, function(err, files) {
    if (err) {
      return console.log("Unable to scan directory: " + err);
    }

    //console.log(files);

    var index = [];
    //global.index = [];

    function doStuff(input) {
      //console.log(input);
      global.index = input;
      index = input;
      index2 = input;
      //res.send(global.index);
    }

    var index2 = [];

    var p1 = new Promise(function(resolve, reject) {
      var forCount = 0;

      for (const file in files) {
        sourceFile.variableName += " " + files[file];
        //console.log("./logs/" + files[file]);

        var content;

        fs.readFile("./logs/" + files[file], function read(err, data) {
          if (err) {
            throw err;
          }
          content = data;

          if (content.includes(username)) {
            index.push(files[file]);
            /*console.log("and i oop-"); global.availfiles += files[file] + " and "; console.log(global.availfiles);*/ sourceFile.variableName =
              files[file];
          }
          doStuff(index);
          forCount += 1;

          if ((forCount = files.length)) resolve(index);
        });
        //console.log(global.index);
      }
    });

    //console.log(sourceFile.variableName);

    p1.then(function(value) {
      console.log("vlaue: " + value);

      res.send(value);
    });
  });
});

app.get("/y:year", function(req, res) {
  const directoryPath = path.join("./logs");
  const year = req.params.year;

  fs.readdir(directoryPath, function(err, files) {
    if (err) {
      return console.log("Unable to scan directory: " + err);
    }

    var index = 0;

    for (const file in files) {
      index += 1;

      var inyearTitle = [];
      var inyearIdent = [];

      request(
        "https://log-parser.glitch.me/" + files[file].split(".html")[0],
        function(error, response, body) {
          if (!error && response.statusCode == 200) {
            var $ = cheerio.load(body);
            var title = $("h1").text();
            //res.send(title.split("/")[2]);
            if (title.split("/")[2] == year) {
              //console.log(title);
              inyearTitle.push(title);
              inyearIdent.push(files[file].split(".html")[0]);
            }
          } else console.log(error);
        }
      );

      if (index == files.length) {
        res.send(inyearTitle);
      }
    }

    //res.send(inyearTitle);

    //res.send(files);
  });
});

app.post("/", function(req, res) {
  console.log("post");
  if (
    !req.files ||
    Object.keys(req.files).length === 0 ||
    !req.files.sampleFile.name.endsWith(".log.gz")
  ) {
    return res.status(400).send("No files were uploaded.");
  }

  // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
  let sampleFile = req.files.sampleFile;

  // Use the mv() method to place the file somewhere on your server
  sampleFile.mv("./" + req.files.sampleFile.name, function(err) {
    if (err) return res.status(500).send(err);

    gunzip(
      "./" + req.files.sampleFile.name,
      req.files.sampleFile.name.split(".gz")[0],
      () => {
        console.log("gunzip done!");

        fs.unlinkSync("./" + req.files.sampleFile.name);
        fs.rename(
          "./" + req.files.sampleFile.name.split(".gz")[0],
          "./" + req.files.sampleFile.name.split(".log.gz")[0] + ".log",
          function(err) {
            if (err) throw err;

            var logfull = req.files.sampleFile.name
              .split(".log.gz")[0]
              .split("-");
            var logname =
              "Log #" +
              logfull[3] +
              " from " +
              logfull[2] +
              "/" +
              logfull[1] +
              "/" +
              logfull[0];

            var log = "";
            var chat =
              '<head><meta property="og:title" content="' +
              logname +
              '" /><meta property="og:type" content="website" /><meta property="og:url" content="' +
              req.protocol +
              "://" +
              req.get("host") +
              req.originalUrl +
              '" /><meta property="og:description" content="Dan\'s CloudCraft Log Parser" /><link rel="stylesheet" href="/chat.css" /></head></body><div class="title"><h1>' +
              logname +
              "</h1></div><br>";

            var s = fs
              .createReadStream(
                "./" + req.files.sampleFile.name.split(".log.gz")[0] + ".log"
              )
              .pipe(es.split())
              .pipe(
                es
                  .mapSync(function(line) {
                    // pause the readstream
                    s.pause();

                    lineNr += 1;

                    // process line here and call s.resume() when rdy
                    // function below was for logging memory usage
                    log += line + "<br>";

                    if (line.includes("issued server command:")) {
                      var time = line.split("[")[1].split("]")[0];
                      var username = line
                        .split(time + "] [Server thread/INFO]: ")[1]
                        .split("issued server command: ")[0]
                        .trim();
                      var command = line
                        .split(username)[1]
                        .split("issued server command: ")[1];

                      chat +=
                        '<div class="commandline" />' +
                        " " +
                        '<div class="timestamp" /><div class="line"></div>' +
                        time +
                        '</div><div class="line"></div><br>' +
                        " " +
                        '<div class="username" />' +
                        username +
                        ":" +
                        "</div>" +
                        " " +
                        '<div class="command" />' +
                        command +
                        "</div>" +
                        " " +
                        "</div><br>";
                    }

                    if (line.includes("<[")) {
                      var time = line.split("[")[1].split("]")[0];
                      var usernametemp = line
                        .split("INFO]: ")[1]
                        .split(">")[0]
                        .replace("<", "")
                        .split("]");
                      var username = usernametemp[usernametemp.length - 1];
                      var message = line.split(username + ">")[1].trim();

                      chat +=
                        '<div class="chatline" />' +
                        " " +
                        '<div class="timestamp" /><div class="line"></div>' +
                        time +
                        '</div><div class="line"></div><br>' +
                        " " +
                        '<div class="username" />' +
                        username +
                        ":" +
                        "</div>" +
                        " " +
                        '<div class="message" />' +
                        message +
                        "</div>" +
                        " " +
                        "</div><br>";
                    } else if (line.includes(": ")) {
                      try {
                              var time = line.split("[")[1].split("]")[0];
                      } catch (e) {}
                      try {
                      var usernametemp = line.split("INFO]: ")[1];//split(":")[0];
                      } catch (e) {}
                      console.log(usernametemp);
                      try {var username = usernametemp.split(":")[0]; } catch (e) {}
                      var messagetemp = line.split(":")
                      var message = messagetemp[messagetemp.length - 1];
                      
                      try {
                        if (username.startsWith("[") && !username.startsWith("[Broadcast]")) {
                      
                                            chat +=
                        '<div class="chatline" />' +
                        " " +
                        '<div class="timestamp" /><div class="line"></div>' +
                        time +
                        '</div><div class="line"></div><br>' +
                        " " +
                        '<div class="username" />' +
                        username +
                        ":" +
                        "</div>" +
                        " " +
                        '<div class="message" />' +
                        message +
                        "</div>" +
                        " " +
                        "</div><br>";
                      
                    }
                      
                    } catch (e) {}
                      
                    }

                    // resume the readstream, possibly from a callback
                    s.resume();
                  })
                  .on("error", function(err) {
                    console.log("Error while reading file.", err);
                  })
                  .on("end", function() {
                    chat += "</body>";

                    var compLog = log.replace(/<br>/g, "\r\n");
                    //console.log(compLog);
                    console.log("Read entire file.");

                    var ran = randomString(
                      8,
                      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
                    );

                    fs.writeFile(
                      "./logs/" +
                        req.files.sampleFile.name.split(".log.gz")[0] +
                        ".html",
                      chat,
                      function(err) {
                        if (err) {
                          return console.log(err);
                        }

                        console.log(
                          "The file was saved as " +
                            req.files.sampleFile.name.split(".log.gz")[0] +
                            ".html!"
                        );
                      }
                    );

                    fs.unlinkSync(
                      "./" +
                        req.files.sampleFile.name.split(".log.gz")[0] +
                        ".log"
                    );

                    var indexName = "./indexedLogs.json";
                    var index = require(indexName);

                    var aight = req.files.sampleFile.name
                      .split(".log.gz")[0]
                      .split("-");
                    
                   /* const jsonInteger = JSON.parse("{\"" + aight[3] + "\" : \"" + "https://log-parser.glitch.me/" + req.files.sampleFile.name.split(".log.gz")[0] + "\"}");
                    
                                        const jsonDay = JSON.parse("{\"" + aight[2] + "\" : " + JSON.stringify(jsonInteger) + "}");
                    
                    const jsonMonth = JSON.parse("{\"" + aight[1] + "\": " + JSON.stringify(jsonDay) + "}");

                    (index[aight[0]]) += jsonMonth; //"https://log-parser.glitch.me/" + req.files.sampleFile.name.split(".log.gz")[0];
                  
            

                    fs.writeFile(indexName, JSON.stringify(index), function(err) {
                      if (err) return console.log(err);
                      console.log(JSON.stringify(index));
                      console.log("writing to " + indexName);
                    });*/

                    res.redirect(
                      "/upload"// "/"+ req.files.sampleFile.name.split(".log.gz")[0]
                    );
                    // TODO {"success": true, "result": (req.files.sampleFile.name.split(".log.gz")[0])}
                  })
              );
          }
        );
      }
    );
  });
});

function getKeyByValue(object, value) {
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      if (object[prop] === value) return prop;
    }
  }
}

app.get("/api", function(req, res) {
  res.send(
    "Send a POST request to the homepage, with a log file, to upload it.\nYou'll be redirected to the log, or notified of any errors."
  ); // this is temporary until i can make a page in monospace.for this // okay :)
}); // btw you might want to note that the log file's name MUST be YYYY-MM-DD.log.gz // this is only temporary, so idrc rn // ah okay aha
// ugh could you move this up above the :logs part please? thanks, dio

// KEEP THE 'LOG' GETTER AT THE BOTTOM
app.get("/:log", function(req, res) {
  const log = req.params.log;
  console.log("get log: " + log);
  res.sendFile(__dirname + "/logs/" + log + ".html");
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log("Your app is listening on port " + listener.address().port);
});

var Twit = require('twit');
const express = require('express');
const app = express();
const server = require('http').Server(app);
var io = require('socket.io')(server);
const dotenv = require('dotenv');

// load public/index.html
app.use(express.static('public'));

// load .env file for configuration
dotenv.config();

// define global variables
var stat = {
  total_tweets: 0,
  tweets_per_sec: 0,
  top_hastag: [],
};

var total_sec = 0;
var g_tweets_arry = [];
var g_hashtags = {};
var g_tweets_url = 0;
var g_tweets_photo = 0;
var g_domains = {};
var g_tweets_emoji = 0;
var g_emojis = {};


// set callback for new websocket connection
io.on('connection', function(socket) {

    // Connect with Twitter stream with 'i' characters. 
    // With this 'i', we can get almost 50 tweets per sec. if better option, we can use them.
    var stream = T.stream('statuses/filter', { track: 'i', language: 'en' })

    stream.on('tweet', function (tweet) {
        // increase total tweets
        stat.total_tweets += 1;

        // add tweet to list
        g_tweets_arry.push(tweet);
    });

    // send statistic infos to client
    setInterval(function() {

      // calc total second from app start
      total_sec += 1;

      stat.tweets_per_sec = (stat.total_tweets/(total_sec));

      // reverse sort for hashtag, get top 3 hashtags
      var sortable = [];
      for( var tag in g_hashtags) {
        sortable.push({tag: tag, value: g_hashtags[tag]});
      }
      
      sortable.sort((a, b) => {
        return b.value - a.value;
      })
      stat["top_hashtag"] = sortable.slice(0, 3);

      // reverse sort for domains, get top 3 domains 
      sortable = [];
      for( var domain in g_domains) {
        sortable.push({domain: domain, value: g_domains[domain]});
      }
      
      sortable.sort( (a, b) => {
        return b.value - a.value;
      });
      stat["tweets_domain"] = sortable.slice(0, 3);

      // reverse sort for emoji list, get top 3 emojis
      sortable = [];
      for( var emoji in g_emojis) {
        sortable.push({emoji: emoji, value: g_emojis[emoji]});
      }
      
      sortable.sort( (a, b) => {
        return b.value - a.value;
      });
      stat["top_emojis"] = sortable.slice(0, 3);
      
      stat["tweets_url"] = g_tweets_url;
      stat["tweets_photo"] = g_tweets_photo;
      stat["tweets_emoji"] = g_tweets_emoji;
      
      // emit json data 
      io.emit("status", stat);
    }, 1000);

    extractInfos();
});

// get emoji and push to global array
function emojiStringToArray (str) {
  split = str.split(/([\uD800-\uDBFF][\uDC00-\uDFFF])/);
  arr = [];
  for (var i=0; i<split.length; i++) {
    char = split[i]
    if (char.length == 2) {
      arr.push(char);
    }
  }
  return arr;
};

// parse first tweet and extract infos
function extractInfos() {
  if(g_tweets_arry.length > 0) {
    var tweet = g_tweets_arry[0];

    // parse hashtags
    if(tweet.entities.hashtags.length > 0) {
      tweet.entities.hashtags.forEach(tag => {
        if(g_hashtags[tag.text] == undefined) {
          g_hashtags[tag.text] = 1;
        }
        else {
          g_hashtags[tag.text] = g_hashtags[tag.text] + 1;
        }        
      });
    }

    // parse tweets that contains URL
    if(tweet.entities.urls.length > 0) {
      g_tweets_url += 1;
      
      tweet.entities.urls.forEach( url => {
        
        var domain = "";
        var pos = url.display_url.indexOf("/");
        domain = url.display_url.substring(0, pos);
        if(domain == "") {
          domain = url.display_url;
          domain = domain.toLowerCase();
        }
        if(g_domains[domain] == undefined) {
          g_domains[domain] = 1;
        }
        else{
          g_domains[domain] = g_domains[domain] + 1;
        }
      });
    }

    //parse tweets that contains photo
    if(tweet.entities.media != undefined && tweet.entities.media.length > 0) {
      tweet.entities.media.forEach( media => {
        if(media.type == "photo") {
          var domain = "";
          var pos = media.display_url.indexOf("/");
          domain = media.display_url.substring(0, pos);
          if( domain == "pic.twitter.com" || domain.includes("instagram")) {
            g_tweets_photo += 1;
          }
        }
      });
    }

    //parse emoji string 
    var str = "";
    if(tweet.extended_tweet != undefined)
      str = tweet.extended_tweet.full_text;     
    else
      str = tweet.text;

    var emoji_arry = [];
    emoji_arry = emojiStringToArray(str);
    if(emoji_arry.length > 0) {
      g_tweets_emoji += 1;

      emoji_arry.forEach((e) => {
        if(g_emojis[e] == undefined)
          g_emojis[e] = 1;
        else
          g_emojis[e] = g_emojis[e] + 1;
      });
    }

    g_tweets_arry.shift();
  }
  setImmediate(extractInfos);
}

// create Twitter stream object
var T = new Twit({
  consumer_key:         process.env.CONSUMER_KEY,
  consumer_secret:      process.env.CONSUMER_SECRET,
  access_token:         process.env.ACCESS_TOKEN,
  access_token_secret:  process.env.ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
});


// listen for requests :)
const listener = server.listen(3000, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});



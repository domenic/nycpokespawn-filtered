"use strict";
const { EventEmitter } = require("events");
const test = require("ava");
const createHappenings = require("../lib/happenings.js");
const fixtureTweets = require("./fixtures/tweets.json");

const fixtureTweet = fixtureTweets[1];
const fixtureTweetWithGoodTTL = fixtureTweets[4];
const fixtureTweetNoIVOrLetter = fixtureTweets[0];
const nonUnownTweet = fixtureTweets[5];

test("emits a 'connected' event when the tweet stream becomes connected", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, [], "12345", []);

  happenings.on("connected", (...args) => {
    t.pass("'connected' event must be emitted");
    t.deepEqual(args, [], "zero arguments must be passed");
  });
  happenings.on("error", err => {
    t.end(err);
  });

  const fakeResponse = { fake: "response" };
  fakeStream.emit("connected", fakeResponse);
});

test("emits an 'error' event when the tweet stream errors", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, [], "12345", []);
  const fakeError = new Error("boo");

  happenings.on("error", (...args) => {
    t.pass("'error' event must be emitted");
    t.deepEqual(args, [fakeError], "the error must be passed as an argument");
  });

  fakeStream.emit("error", fakeError);
});

test("emits a 'spawn' event when an Unown spawns without IV or letter information", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", []);

  happenings.on("spawn", (...args) => {
    t.pass("'spawn' event must be emitted");
    t.deepEqual(
      args,
      [{
        iv: "unknown",
        letter: "unknown",
        ttl: "unknown",
        url: "https://maps.google.com/?q=35.41025,139.93000"
      }]
    );
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweetNoIVOrLetter);
});

test("emits a 'spawn' event when an Unown spawns with IV and letter information", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", []);

  happenings.on("spawn", (...args) => {
    t.pass("'spawn' event must be emitted");
    t.deepEqual(
      args,
      [{
        iv: "60%",
        letter: "V",
        ttl: "unknown",
        url: "https://maps.google.com/?q=-37.78350,144.95107"
      }]
    );
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweet);
});

test("emits a 'spawn' event when an Unown spawns with a known TTL", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", []);

  happenings.on("spawn", (...args) => {
    t.pass("'spawn' event must be emitted");
    t.deepEqual(
      args,
      [{
        iv: "49%",
        letter: "unknown",
        ttl: "24m 22s",
        url: "https://maps.google.com/?q=42.38131,-88.06614"
      }]
    );
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweetWithGoodTTL);
});

test("does not emit an event if the tweet is from a different user", t => {
  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "1234", []);

  happenings.on("spawn", () => {
    t.fail("'spawn' event must not be emitted");
  });
  happenings.on("spawn within range", () => {
    t.fail("'spawn within range' event must not be emitted");
  });
  happenings.on("error", err => {
    t.end(err);
  });

  const fakeTweet = JSON.parse(JSON.stringify(fixtureTweet));
  fakeTweet.user.id_str = "1235";
  fakeStream.emit("tweet", fakeTweet);

  t.pass("No events were emitted");
});

test("emits an error event if it can't parse the tweet", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", []);

  happenings.on("spawn", () => {
    t.fail("'spawn' event must not be emitted");
  });
  happenings.on("spawn within range", () => {
    t.fail("'spawn within range' event must not be emitted");
  });
  happenings.on("error", error => {
    t.pass("'error' event must be emitted");
    t.is(error.message, `Could not parse tweet with text '${nonUnownTweet.text}'`);
  });

  fakeStream.emit("tweet", nonUnownTweet);
});

test.cb("emits a 'spawn within range' event when an Unown spawns within range without IV or letter information", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", [
    {
      label: "Home",
      latitude: 35.4,
      longitude: 139.9,
      radius: 10
    }
  ]);

  happenings.on("spawn within range", (...args) => {
    t.pass("'spawn within range' event must be emitted");
    t.deepEqual(
      args,
      [{
        iv: "unknown",
        letter: "unknown",
        ttl: "unknown",
        url: "https://maps.google.com/?q=35.41025,139.93000",
        distance: 2.9481892766644737,
        closeTo: "Home"
      }]
    );

    t.end();
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweetNoIVOrLetter);
});

test.cb("emits a 'spawn within range' event when an Unown spawns within range with IV and letter information", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", [
    {
      label: "Home",
      latitude: -37.7,
      longitude: 144.9,
      radius: 20
    }
  ]);

  happenings.on("spawn within range", (...args) => {
    t.pass("'spawn within range' event must be emitted");
    t.deepEqual(
      args,
      [{
        iv: "60%",
        letter: "V",
        ttl: "unknown",
        url: "https://maps.google.com/?q=-37.78350,144.95107",
        distance: 10.31371088139344,
        closeTo: "Home"
      }]
    );

    t.end();
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweet);
});

test("emits a 'spawn within range' event when an Unown spawns within range with a known TTL", t => {
  t.plan(2);

  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", [
    {
      label: "Home",
      latitude: 42.3,
      longitude: -88.0,
      radius: 20
    }
  ]);

  happenings.on("spawn within range", (...args) => {
    t.pass("'spawn within range' event must be emitted");
    t.deepEqual(
      args,
      [{
        iv: "49%",
        letter: "unknown",
        ttl: "24m 22s",
        url: "https://maps.google.com/?q=42.38131,-88.06614",
        distance: 10.54964604801562,
        closeTo: "Home"
      }]
    );
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweetWithGoodTTL);
});

test("does not emit 'spawn within range' event when an Unown spawns outside of the range", t => {
  const fakeStream = new EventEmitter();
  const happenings = createHappenings(fakeStream, "837234225715818497", [
    {
      label: "Home",
      latitude: 40.80,
      longitude: -73.96,
      radius: 0.9
    }
  ]);

  happenings.on("spawn within range", () => {
    t.fail("'spawn within range' must not be emitted");
  });
  happenings.on("error", err => {
    t.end(err);
  });

  fakeStream.emit("tweet", fixtureTweet);

  t.pass("No events were emitted");
});

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.window = global.window || {})));
}(this, (function (exports) { 'use strict';

  /**
   * [![npm version](https://img.shields.io/npm/v/tonal-note.svg)](https://www.npmjs.com/package/tonal-note)
   * [![tonal](https://img.shields.io/badge/tonal-note-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
   *
   * `tonal-note` is a collection of functions to manipulate musical notes in scientific notation
   *
   * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
   *
   * ## Usage
   *
   * ```js
   * import * as Note from "tonal-note"
   * // or const Note = require("tonal-note")
   * Note.name("bb2") // => "Bb2"
   * Note.chroma("bb2") // => 10
   * Note.midi("a4") // => 69
   * Note.freq("a4") // => 440
   * Note.oct("G3") // => 3
   *
   * // part of tonal
   * const Tonal = require("tonal")
   * // or import Note from "tonal"
   * Tonal.Note.midi("d4") // => 62
   * ```
   *
   * ## Install
   *
   * [![npm install tonal-note](https://nodei.co/npm/tonal-note.png?mini=true)](https://npmjs.org/package/tonal-note/)
   *
   * ## API Documentation
   *
   * @module Note
   */

  var NAMES = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B".split(" ");

  /**
   * Get a list of note names (pitch classes) within a octave
   *
   * @param {string} accTypes - (Optional, by default " b#"). A string with the
   * accidentals types: " " means no accidental, "#" means sharps, "b" mean flats,
   * can be conbined (see examples)
   * @return {Array}
   * @example
   * Note.names(" b") // => [ "C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B" ]
   * Note.names(" #") // => [ "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B" ]
   */
  var names = function (accTypes) { return typeof accTypes !== "string"
      ? NAMES.slice()
      : NAMES.filter(function (n) {
          var acc = n[1] || " ";
          return accTypes.indexOf(acc) !== -1;
        }); };

  var SHARPS = names(" #");
  var FLATS = names(" b");
  var REGEX = /^([a-gA-G]?)(#{1,}|b{1,}|x{1,}|)(-?\d*)\s*(.*)$/;

  /**
   * Split a string into tokens related to note parts.
   * It returns an array of strings `[letter, accidental, octave, modifier]`
   *
   * It always returns an array
   *
   * @param {String} str
   * @return {Array} an array of note tokens
   * @example
   * Note.tokenize("C#2") // => ["C", "#", "2", ""]
   * Note.tokenize("Db3 major") // => ["D", "b", "3", "major"]
   * Note.tokenize("major") // => ["", "", "", "major"]
   * Note.tokenize("##") // => ["", "##", "", ""]
   * Note.tokenize() // => ["", "", "", ""]
   */
  function tokenize(str) {
    if (typeof str !== "string") { str = ""; }
    var m = REGEX.exec(str);
    if (!m) { return null; }
    return [m[1].toUpperCase(), m[2].replace(/x/g, "##"), m[3], m[4]];
  }

  var NO_NOTE = Object.freeze({
    pc: null,
    name: null,
    step: null,
    alt: null,
    oct: null,
    octStr: null,
    chroma: null,
    midi: null,
    freq: null
  });

  var SEMI = [0, 2, 4, 5, 7, 9, 11];
  var properties = function (str) {
    var tokens = tokenize(str);
    if (tokens[0] === "" || tokens[3] !== "") { return NO_NOTE; }
    var letter = tokens[0];
    var acc = tokens[1];
    var octStr = tokens[2];
    var p = { letter: letter, acc: acc, octStr: octStr };
    p.pc = p.letter + p.acc;
    p.name = p.pc + octStr;
    p.step = (p.letter.charCodeAt(0) + 3) % 7;
    p.alt = p.acc[0] === "b" ? -p.acc.length : p.acc.length;
    p.oct = octStr.length ? +octStr : null;
    p.chroma = (SEMI[p.step] + p.alt + 120) % 12;
    p.midi = p.oct !== null ? SEMI[p.step] + p.alt + 12 * (p.oct + 1) : null;
    p.freq = midiToFreq(p.midi);
    return Object.freeze(p);
  };

  var memo = function (fn, cache) {
    if ( cache === void 0 ) cache = {};

    return function (str) { return cache[str] || (cache[str] = fn(str)); };
  };

  /**
   * Get note properties. It returns an object with the following information:
   *
   * - name {String}: the note name. The letter is always in uppercase
   * - letter {String}: the note letter, always in uppercase
   * - acc {String}: the note accidentals
   * - octave {Number}: the octave or null if not present
   * - pc {String}: the pitch class (letter + accidentals)
   * - step {Number}: number equivalent of the note letter. 0 means C ... 6 means B.
   * - alt {Number}: number equivalent of accidentals (negative are flats, positive sharps)
   * - chroma {Number}: number equivalent of the pitch class, where 0 is C, 1 is C# or Db, 2 is D...
   * - midi {Number}: the note midi number
   * - freq {Number}: the frequency using an equal temperament at 440Hz
   *
   * This function *always* returns an object with all this properties, but if it"s
   * not a valid note all properties will be null.
   *
   * The returned object can"t be mutated.
   *
   * @param {String} note - the note name in scientific notation
   * @return {Object} an object with the properties (or an object will all properties
   * set to null if not valid note)
   * @example
   * Note.props("fx-3").name // => "F##-3"
   * Note.props("invalid").name // => null
   * Note.props("C#3").oct // => 3
   * Note.props().oct // => null
   */
  var props = memo(properties);

  /**
   * Given a note name, return the note name or null if not valid note.
   * The note name will ALWAYS have the letter in upercase and accidentals
   * using # or b
   *
   * Can be used to test if a string is a valid note name.
   *
   * @function
   * @param {Pitch|string}
   * @return {string}
   *
   * @example
   * Note.name("cb2") // => "Cb2"
   * ["c", "db3", "2", "g+", "gx4"].map(Note.name) // => ["C", "Db3", null, null, "G##4"]
   */
  var name = function (str) { return props(str).name; };

  /**
   * Get pitch class of a note. The note can be a string or a pitch array.
   *
   * @function
   * @param {string|Pitch}
   * @return {string} the pitch class
   * @example
   * Note.pc("Db3") // => "Db"
   * ["db3", "bb6", "fx2"].map(Note.pc) // => [ "Db", "Bb", "F##"]
   */
  var pc = function (str) { return props(str).pc; };

  /**
   * Get the note midi number
   * (an alias of tonal-midi `toMidi` function)
   *
   * @function
   * @param {string|Number} note - the note to get the midi number from
   * @return {Integer} the midi number or null if not valid pitch
   * @example
   * Note.midi("C4") // => 60
   * Note.midi(60) // => 60
   * @see midi.toMidi
   */
  var midi = function (note) { return props(note).midi || +note || null; };

  /**
   * Get the frequency from midi number
   *
   * @param {Number} midi - the note midi number
   * @param {Number} tuning - (Optional) 440 by default
   * @return {Number} the frequency or null if not valid note midi
   */
  var midiToFreq = function (midi, tuning) {
      if ( tuning === void 0 ) tuning = 440;

      return typeof midi === "number" ? Math.pow(2, (midi - 69) / 12) * tuning : null;
  };

  /**
   * Return the chroma of a note. The chroma is the numeric equivalent to the
   * pitch class, where 0 is C, 1 is C# or Db, 2 is D... 11 is B
   *
   * @param {string} note - the note name
   * @return {Integer} the chroma number
   * @example
   * Note.chroma("Cb") // => 11
   * ["C", "D", "E", "F"].map(Note.chroma) // => [0, 2, 4, 5]
   */
  var chroma = function (str) { return props(str).chroma; };

  var chromatic = [
  	"1P 2m 2M 3m 3M 4P 4A 5P 6m 6M 7m 7M"
  ];
  var lydian = [
  	"1P 2M 3M 4A 5P 6M 7M"
  ];
  var major = [
  	"1P 2M 3M 4P 5P 6M 7M",
  	[
  		"ionian"
  	]
  ];
  var mixolydian = [
  	"1P 2M 3M 4P 5P 6M 7m",
  	[
  		"dominant"
  	]
  ];
  var dorian = [
  	"1P 2M 3m 4P 5P 6M 7m"
  ];
  var aeolian = [
  	"1P 2M 3m 4P 5P 6m 7m",
  	[
  		"minor"
  	]
  ];
  var phrygian = [
  	"1P 2m 3m 4P 5P 6m 7m"
  ];
  var locrian = [
  	"1P 2m 3m 4P 5d 6m 7m"
  ];
  var altered = [
  	"1P 2m 3m 3M 5d 6m 7m",
  	[
  		"super locrian",
  		"diminished whole tone",
  		"pomeroy"
  	]
  ];
  var iwato = [
  	"1P 2m 4P 5d 7m"
  ];
  var hirajoshi = [
  	"1P 2M 3m 5P 6m"
  ];
  var kumoijoshi = [
  	"1P 2m 4P 5P 6m"
  ];
  var pelog = [
  	"1P 2m 3m 5P 6m"
  ];
  var prometheus = [
  	"1P 2M 3M 4A 6M 7m"
  ];
  var ritusen = [
  	"1P 2M 4P 5P 6M"
  ];
  var scriabin = [
  	"1P 2m 3M 5P 6M"
  ];
  var piongio = [
  	"1P 2M 4P 5P 6M 7m"
  ];
  var augmented = [
  	"1P 2A 3M 5P 5A 7M"
  ];
  var neopolitan = [
  	"1P 2m 3m 4P 5P 6m 7M"
  ];
  var diminished = [
  	"1P 2M 3m 4P 5d 6m 6M 7M"
  ];
  var egyptian = [
  	"1P 2M 4P 5P 7m"
  ];
  var oriental = [
  	"1P 2m 3M 4P 5d 6M 7m"
  ];
  var spanish = [
  	"1P 2m 3M 4P 5P 6m 7m",
  	[
  		"phrygian major"
  	]
  ];
  var flamenco = [
  	"1P 2m 3m 3M 4A 5P 7m"
  ];
  var balinese = [
  	"1P 2m 3m 4P 5P 6m 7M"
  ];
  var persian = [
  	"1P 2m 3M 4P 5d 6m 7M"
  ];
  var bebop = [
  	"1P 2M 3M 4P 5P 6M 7m 7M"
  ];
  var enigmatic = [
  	"1P 2m 3M 5d 6m 7m 7M"
  ];
  var ichikosucho = [
  	"1P 2M 3M 4P 5d 5P 6M 7M"
  ];
  var sdata = {
  	chromatic: chromatic,
  	lydian: lydian,
  	major: major,
  	mixolydian: mixolydian,
  	dorian: dorian,
  	aeolian: aeolian,
  	phrygian: phrygian,
  	locrian: locrian,
  	"melodic minor": [
  	"1P 2M 3m 4P 5P 6M 7M"
  ],
  	"melodic minor second mode": [
  	"1P 2m 3m 4P 5P 6M 7m"
  ],
  	"lydian augmented": [
  	"1P 2M 3M 4A 5A 6M 7M"
  ],
  	"lydian dominant": [
  	"1P 2M 3M 4A 5P 6M 7m",
  	[
  		"lydian b7"
  	]
  ],
  	"melodic minor fifth mode": [
  	"1P 2M 3M 4P 5P 6m 7m",
  	[
  		"hindu",
  		"mixolydian b6M"
  	]
  ],
  	"locrian #2": [
  	"1P 2M 3m 4P 5d 6m 7m"
  ],
  	"locrian major": [
  	"1P 2M 3M 4P 5d 6m 7m",
  	[
  		"arabian"
  	]
  ],
  	altered: altered,
  	"major pentatonic": [
  	"1P 2M 3M 5P 6M",
  	[
  		"pentatonic"
  	]
  ],
  	"lydian pentatonic": [
  	"1P 3M 4A 5P 7M",
  	[
  		"chinese"
  	]
  ],
  	"mixolydian pentatonic": [
  	"1P 3M 4P 5P 7m",
  	[
  		"indian"
  	]
  ],
  	"locrian pentatonic": [
  	"1P 3m 4P 5d 7m",
  	[
  		"minor seven flat five pentatonic"
  	]
  ],
  	"minor pentatonic": [
  	"1P 3m 4P 5P 7m"
  ],
  	"minor six pentatonic": [
  	"1P 3m 4P 5P 6M"
  ],
  	"minor hexatonic": [
  	"1P 2M 3m 4P 5P 7M"
  ],
  	"flat three pentatonic": [
  	"1P 2M 3m 5P 6M",
  	[
  		"kumoi"
  	]
  ],
  	"flat six pentatonic": [
  	"1P 2M 3M 5P 6m"
  ],
  	"major flat two pentatonic": [
  	"1P 2m 3M 5P 6M"
  ],
  	"whole tone pentatonic": [
  	"1P 3M 5d 6m 7m"
  ],
  	"ionian pentatonic": [
  	"1P 3M 4P 5P 7M"
  ],
  	"lydian #5P pentatonic": [
  	"1P 3M 4A 5A 7M"
  ],
  	"lydian dominant pentatonic": [
  	"1P 3M 4A 5P 7m"
  ],
  	"minor #7M pentatonic": [
  	"1P 3m 4P 5P 7M"
  ],
  	"super locrian pentatonic": [
  	"1P 3m 4d 5d 7m"
  ],
  	"in-sen": [
  	"1P 2m 4P 5P 7m"
  ],
  	iwato: iwato,
  	hirajoshi: hirajoshi,
  	kumoijoshi: kumoijoshi,
  	pelog: pelog,
  	"vietnamese 1": [
  	"1P 3m 4P 5P 6m"
  ],
  	"vietnamese 2": [
  	"1P 3m 4P 5P 7m"
  ],
  	prometheus: prometheus,
  	"prometheus neopolitan": [
  	"1P 2m 3M 4A 6M 7m"
  ],
  	ritusen: ritusen,
  	scriabin: scriabin,
  	piongio: piongio,
  	"major blues": [
  	"1P 2M 3m 3M 5P 6M"
  ],
  	"minor blues": [
  	"1P 3m 4P 5d 5P 7m",
  	[
  		"blues"
  	]
  ],
  	"composite blues": [
  	"1P 2M 3m 3M 4P 5d 5P 6M 7m"
  ],
  	augmented: augmented,
  	"augmented heptatonic": [
  	"1P 2A 3M 4P 5P 5A 7M"
  ],
  	"dorian #4": [
  	"1P 2M 3m 4A 5P 6M 7m"
  ],
  	"lydian diminished": [
  	"1P 2M 3m 4A 5P 6M 7M"
  ],
  	"whole tone": [
  	"1P 2M 3M 4A 5A 7m"
  ],
  	"leading whole tone": [
  	"1P 2M 3M 4A 5A 7m 7M"
  ],
  	"harmonic minor": [
  	"1P 2M 3m 4P 5P 6m 7M"
  ],
  	"lydian minor": [
  	"1P 2M 3M 4A 5P 6m 7m"
  ],
  	neopolitan: neopolitan,
  	"neopolitan minor": [
  	"1P 2m 3m 4P 5P 6m 7M"
  ],
  	"neopolitan major": [
  	"1P 2m 3m 4P 5P 6M 7M",
  	[
  		"dorian b2"
  	]
  ],
  	"neopolitan major pentatonic": [
  	"1P 3M 4P 5d 7m"
  ],
  	"romanian minor": [
  	"1P 2M 3m 5d 5P 6M 7m"
  ],
  	"double harmonic lydian": [
  	"1P 2m 3M 4A 5P 6m 7M"
  ],
  	diminished: diminished,
  	"harmonic major": [
  	"1P 2M 3M 4P 5P 6m 7M"
  ],
  	"double harmonic major": [
  	"1P 2m 3M 4P 5P 6m 7M",
  	[
  		"gypsy"
  	]
  ],
  	egyptian: egyptian,
  	"hungarian minor": [
  	"1P 2M 3m 4A 5P 6m 7M"
  ],
  	"hungarian major": [
  	"1P 2A 3M 4A 5P 6M 7m"
  ],
  	oriental: oriental,
  	spanish: spanish,
  	"spanish heptatonic": [
  	"1P 2m 3m 3M 4P 5P 6m 7m"
  ],
  	flamenco: flamenco,
  	balinese: balinese,
  	"todi raga": [
  	"1P 2m 3m 4A 5P 6m 7M"
  ],
  	"malkos raga": [
  	"1P 3m 4P 6m 7m"
  ],
  	"kafi raga": [
  	"1P 3m 3M 4P 5P 6M 7m 7M"
  ],
  	"purvi raga": [
  	"1P 2m 3M 4P 4A 5P 6m 7M"
  ],
  	persian: persian,
  	bebop: bebop,
  	"bebop dominant": [
  	"1P 2M 3M 4P 5P 6M 7m 7M"
  ],
  	"bebop minor": [
  	"1P 2M 3m 3M 4P 5P 6M 7m"
  ],
  	"bebop major": [
  	"1P 2M 3M 4P 5P 5A 6M 7M"
  ],
  	"bebop locrian": [
  	"1P 2m 3m 4P 5d 5P 6m 7m"
  ],
  	"minor bebop": [
  	"1P 2M 3m 4P 5P 6m 7m 7M"
  ],
  	"mystery #1": [
  	"1P 2m 3M 5d 6m 7m"
  ],
  	enigmatic: enigmatic,
  	"minor six diminished": [
  	"1P 2M 3m 4P 5P 6m 6M 7M"
  ],
  	"ionian augmented": [
  	"1P 2M 3M 4P 5A 6M 7M"
  ],
  	"lydian #9": [
  	"1P 2m 3M 4A 5P 6M 7M"
  ],
  	ichikosucho: ichikosucho,
  	"six tone symmetric": [
  	"1P 2m 3M 4P 5A 6M"
  ]
  };

  var M = [
  	"1P 3M 5P",
  	[
  		"Major",
  		""
  	]
  ];
  var M13 = [
  	"1P 3M 5P 7M 9M 13M",
  	[
  		"maj13",
  		"Maj13"
  	]
  ];
  var M6 = [
  	"1P 3M 5P 13M",
  	[
  		"6"
  	]
  ];
  var M69 = [
  	"1P 3M 5P 6M 9M",
  	[
  		"69"
  	]
  ];
  var M7add13 = [
  	"1P 3M 5P 6M 7M 9M"
  ];
  var M7b5 = [
  	"1P 3M 5d 7M"
  ];
  var M7b6 = [
  	"1P 3M 6m 7M"
  ];
  var M7b9 = [
  	"1P 3M 5P 7M 9m"
  ];
  var M7sus4 = [
  	"1P 4P 5P 7M"
  ];
  var M9 = [
  	"1P 3M 5P 7M 9M",
  	[
  		"maj9",
  		"Maj9"
  	]
  ];
  var M9b5 = [
  	"1P 3M 5d 7M 9M"
  ];
  var M9sus4 = [
  	"1P 4P 5P 7M 9M"
  ];
  var Madd9 = [
  	"1P 3M 5P 9M",
  	[
  		"2",
  		"add9",
  		"add2"
  	]
  ];
  var Maj7 = [
  	"1P 3M 5P 7M",
  	[
  		"maj7",
  		"M7"
  	]
  ];
  var Mb5 = [
  	"1P 3M 5d"
  ];
  var Mb6 = [
  	"1P 3M 13m"
  ];
  var Msus2 = [
  	"1P 2M 5P",
  	[
  		"add9no3",
  		"sus2"
  	]
  ];
  var Msus4 = [
  	"1P 4P 5P",
  	[
  		"sus",
  		"sus4"
  	]
  ];
  var Maddb9 = [
  	"1P 3M 5P 9m"
  ];
  var m = [
  	"1P 3m 5P"
  ];
  var m11 = [
  	"1P 3m 5P 7m 9M 11P",
  	[
  		"_11"
  	]
  ];
  var m11b5 = [
  	"1P 3m 7m 12d 2M 4P",
  	[
  		"h11",
  		"_11b5"
  	]
  ];
  var m13 = [
  	"1P 3m 5P 7m 9M 11P 13M",
  	[
  		"_13"
  	]
  ];
  var m6 = [
  	"1P 3m 4P 5P 13M",
  	[
  		"_6"
  	]
  ];
  var m69 = [
  	"1P 3m 5P 6M 9M",
  	[
  		"_69"
  	]
  ];
  var m7 = [
  	"1P 3m 5P 7m",
  	[
  		"minor7",
  		"_",
  		"_7"
  	]
  ];
  var m7add11 = [
  	"1P 3m 5P 7m 11P",
  	[
  		"m7add4"
  	]
  ];
  var m7b5 = [
  	"1P 3m 5d 7m",
  	[
  		"half-diminished",
  		"h7",
  		"_7b5"
  	]
  ];
  var m9 = [
  	"1P 3m 5P 7m 9M",
  	[
  		"_9"
  	]
  ];
  var m9b5 = [
  	"1P 3m 7m 12d 2M",
  	[
  		"h9",
  		"-9b5"
  	]
  ];
  var mMaj7 = [
  	"1P 3m 5P 7M",
  	[
  		"mM7",
  		"_M7"
  	]
  ];
  var mMaj7b6 = [
  	"1P 3m 5P 6m 7M",
  	[
  		"mM7b6"
  	]
  ];
  var mM9 = [
  	"1P 3m 5P 7M 9M",
  	[
  		"mMaj9",
  		"-M9"
  	]
  ];
  var mM9b6 = [
  	"1P 3m 5P 6m 7M 9M",
  	[
  		"mMaj9b6"
  	]
  ];
  var mb6M7 = [
  	"1P 3m 6m 7M"
  ];
  var mb6b9 = [
  	"1P 3m 6m 9m"
  ];
  var o = [
  	"1P 3m 5d",
  	[
  		"mb5",
  		"dim"
  	]
  ];
  var o7 = [
  	"1P 3m 5d 13M",
  	[
  		"diminished",
  		"m6b5",
  		"dim7"
  	]
  ];
  var o7M7 = [
  	"1P 3m 5d 6M 7M"
  ];
  var oM7 = [
  	"1P 3m 5d 7M"
  ];
  var sus24 = [
  	"1P 2M 4P 5P",
  	[
  		"sus4add9"
  	]
  ];
  var madd4 = [
  	"1P 3m 4P 5P"
  ];
  var madd9 = [
  	"1P 3m 5P 9M"
  ];
  var cdata = {
  	"4": [
  	"1P 4P 7m 10m",
  	[
  		"quartal"
  	]
  ],
  	"5": [
  	"1P 5P"
  ],
  	"7": [
  	"1P 3M 5P 7m",
  	[
  		"Dominant",
  		"Dom"
  	]
  ],
  	"9": [
  	"1P 3M 5P 7m 9M",
  	[
  		"79"
  	]
  ],
  	"11": [
  	"1P 5P 7m 9M 11P"
  ],
  	"13": [
  	"1P 3M 5P 7m 9M 13M",
  	[
  		"13_"
  	]
  ],
  	"64": [
  	"5P 8P 10M"
  ],
  	M: M,
  	"M#5": [
  	"1P 3M 5A",
  	[
  		"augmented",
  		"maj#5",
  		"Maj#5",
  		"+",
  		"aug"
  	]
  ],
  	"M#5add9": [
  	"1P 3M 5A 9M",
  	[
  		"+add9"
  	]
  ],
  	M13: M13,
  	"M13#11": [
  	"1P 3M 5P 7M 9M 11A 13M",
  	[
  		"maj13#11",
  		"Maj13#11",
  		"M13+4",
  		"M13#4"
  	]
  ],
  	M6: M6,
  	"M6#11": [
  	"1P 3M 5P 6M 11A",
  	[
  		"M6b5",
  		"6#11",
  		"6b5"
  	]
  ],
  	M69: M69,
  	"M69#11": [
  	"1P 3M 5P 6M 9M 11A"
  ],
  	"M7#11": [
  	"1P 3M 5P 7M 11A",
  	[
  		"maj7#11",
  		"Maj7#11",
  		"M7+4",
  		"M7#4"
  	]
  ],
  	"M7#5": [
  	"1P 3M 5A 7M",
  	[
  		"maj7#5",
  		"Maj7#5",
  		"maj9#5",
  		"M7+"
  	]
  ],
  	"M7#5sus4": [
  	"1P 4P 5A 7M"
  ],
  	"M7#9#11": [
  	"1P 3M 5P 7M 9A 11A"
  ],
  	M7add13: M7add13,
  	M7b5: M7b5,
  	M7b6: M7b6,
  	M7b9: M7b9,
  	M7sus4: M7sus4,
  	M9: M9,
  	"M9#11": [
  	"1P 3M 5P 7M 9M 11A",
  	[
  		"maj9#11",
  		"Maj9#11",
  		"M9+4",
  		"M9#4"
  	]
  ],
  	"M9#5": [
  	"1P 3M 5A 7M 9M",
  	[
  		"Maj9#5"
  	]
  ],
  	"M9#5sus4": [
  	"1P 4P 5A 7M 9M"
  ],
  	M9b5: M9b5,
  	M9sus4: M9sus4,
  	Madd9: Madd9,
  	Maj7: Maj7,
  	Mb5: Mb5,
  	Mb6: Mb6,
  	Msus2: Msus2,
  	Msus4: Msus4,
  	Maddb9: Maddb9,
  	"11b9": [
  	"1P 5P 7m 9m 11P"
  ],
  	"13#11": [
  	"1P 3M 5P 7m 9M 11A 13M",
  	[
  		"13+4",
  		"13#4"
  	]
  ],
  	"13#9": [
  	"1P 3M 5P 7m 9A 13M",
  	[
  		"13#9_"
  	]
  ],
  	"13#9#11": [
  	"1P 3M 5P 7m 9A 11A 13M"
  ],
  	"13b5": [
  	"1P 3M 5d 6M 7m 9M"
  ],
  	"13b9": [
  	"1P 3M 5P 7m 9m 13M"
  ],
  	"13b9#11": [
  	"1P 3M 5P 7m 9m 11A 13M"
  ],
  	"13no5": [
  	"1P 3M 7m 9M 13M"
  ],
  	"13sus4": [
  	"1P 4P 5P 7m 9M 13M",
  	[
  		"13sus"
  	]
  ],
  	"69#11": [
  	"1P 3M 5P 6M 9M 11A"
  ],
  	"7#11": [
  	"1P 3M 5P 7m 11A",
  	[
  		"7+4",
  		"7#4",
  		"7#11_",
  		"7#4_"
  	]
  ],
  	"7#11b13": [
  	"1P 3M 5P 7m 11A 13m",
  	[
  		"7b5b13"
  	]
  ],
  	"7#5": [
  	"1P 3M 5A 7m",
  	[
  		"+7",
  		"7aug",
  		"aug7"
  	]
  ],
  	"7#5#9": [
  	"1P 3M 5A 7m 9A",
  	[
  		"7alt",
  		"7#5#9_",
  		"7#9b13_"
  	]
  ],
  	"7#5b9": [
  	"1P 3M 5A 7m 9m"
  ],
  	"7#5b9#11": [
  	"1P 3M 5A 7m 9m 11A"
  ],
  	"7#5sus4": [
  	"1P 4P 5A 7m"
  ],
  	"7#9": [
  	"1P 3M 5P 7m 9A",
  	[
  		"7#9_"
  	]
  ],
  	"7#9#11": [
  	"1P 3M 5P 7m 9A 11A",
  	[
  		"7b5#9"
  	]
  ],
  	"7#9#11b13": [
  	"1P 3M 5P 7m 9A 11A 13m"
  ],
  	"7#9b13": [
  	"1P 3M 5P 7m 9A 13m"
  ],
  	"7add6": [
  	"1P 3M 5P 7m 13M",
  	[
  		"67",
  		"7add13"
  	]
  ],
  	"7b13": [
  	"1P 3M 7m 13m"
  ],
  	"7b5": [
  	"1P 3M 5d 7m"
  ],
  	"7b6": [
  	"1P 3M 5P 6m 7m"
  ],
  	"7b9": [
  	"1P 3M 5P 7m 9m"
  ],
  	"7b9#11": [
  	"1P 3M 5P 7m 9m 11A",
  	[
  		"7b5b9"
  	]
  ],
  	"7b9#9": [
  	"1P 3M 5P 7m 9m 9A"
  ],
  	"7b9b13": [
  	"1P 3M 5P 7m 9m 13m"
  ],
  	"7b9b13#11": [
  	"1P 3M 5P 7m 9m 11A 13m",
  	[
  		"7b9#11b13",
  		"7b5b9b13"
  	]
  ],
  	"7no5": [
  	"1P 3M 7m"
  ],
  	"7sus4": [
  	"1P 4P 5P 7m",
  	[
  		"7sus"
  	]
  ],
  	"7sus4b9": [
  	"1P 4P 5P 7m 9m",
  	[
  		"susb9",
  		"7susb9",
  		"7b9sus",
  		"7b9sus4",
  		"phryg"
  	]
  ],
  	"7sus4b9b13": [
  	"1P 4P 5P 7m 9m 13m",
  	[
  		"7b9b13sus4"
  	]
  ],
  	"9#11": [
  	"1P 3M 5P 7m 9M 11A",
  	[
  		"9+4",
  		"9#4",
  		"9#11_",
  		"9#4_"
  	]
  ],
  	"9#11b13": [
  	"1P 3M 5P 7m 9M 11A 13m",
  	[
  		"9b5b13"
  	]
  ],
  	"9#5": [
  	"1P 3M 5A 7m 9M",
  	[
  		"9+"
  	]
  ],
  	"9#5#11": [
  	"1P 3M 5A 7m 9M 11A"
  ],
  	"9b13": [
  	"1P 3M 7m 9M 13m"
  ],
  	"9b5": [
  	"1P 3M 5d 7m 9M"
  ],
  	"9no5": [
  	"1P 3M 7m 9M"
  ],
  	"9sus4": [
  	"1P 4P 5P 7m 9M",
  	[
  		"9sus"
  	]
  ],
  	m: m,
  	"m#5": [
  	"1P 3m 5A",
  	[
  		"m+",
  		"mb6"
  	]
  ],
  	m11: m11,
  	"m11A 5": [
  	"1P 3m 6m 7m 9M 11P"
  ],
  	m11b5: m11b5,
  	m13: m13,
  	m6: m6,
  	m69: m69,
  	m7: m7,
  	"m7#5": [
  	"1P 3m 6m 7m"
  ],
  	m7add11: m7add11,
  	m7b5: m7b5,
  	m9: m9,
  	"m9#5": [
  	"1P 3m 6m 7m 9M"
  ],
  	m9b5: m9b5,
  	mMaj7: mMaj7,
  	mMaj7b6: mMaj7b6,
  	mM9: mM9,
  	mM9b6: mM9b6,
  	mb6M7: mb6M7,
  	mb6b9: mb6b9,
  	o: o,
  	o7: o7,
  	o7M7: o7M7,
  	oM7: oM7,
  	sus24: sus24,
  	"+add#9": [
  	"1P 3M 5A 9A"
  ],
  	madd4: madd4,
  	madd9: madd9
  };

  /**
   * [![npm version](https://img.shields.io/npm/v/tonal-interval.svg)](https://www.npmjs.com/package/tonal-interval)
   * [![tonal](https://img.shields.io/badge/tonal-interval-yellow.svg)](https://www.npmjs.com/browse/keyword/tonal)
   *
   * `tonal-interval` is a collection of functions to create and manipulate music intervals.
   *
   * The intervals are strings in shorthand notation. Two variations are supported:
   *
   * - standard shorthand notation: type and number, for example: "M3", "d-4"
   * - inverse shorthand notation: number and then type, for example: "3M", "-4d"
   *
   * The problem with the standard shorthand notation is that some strings can be
   * parsed as notes or intervals, for example: "A4" can be note A in 4th octave
   * or an augmented four. To remove ambiguity, the prefered notation in tonal is the
   * inverse shortand notation.
   *
   * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
   *
   * ## Usage
   *
   * ```js
   * // es6
   * import * as Interval from "tonal-interval"
   * // es5
   * const Interval = require("tonal-interval")
   * // part of tonal
   * import { Interval } from "tonal"
   *
   * Interval.semitones("4P") // => 5
   * Interval.invert("3m") // => "6M"
   * Interval.simplify("9m") // => "2m"
   * ```
   *
   * ## Install
   *
   * [![npm install tonal-interval](https://nodei.co/npm/tonal-interval.png?mini=true)](https://npmjs.org/package/tonal-interval/)
   *
   * ## API Documentation
   *
   * @module Interval
   */
  // shorthand tonal notation (with quality after number)
  var IVL_TNL = "([-+]?\\d+)(d{1,4}|m|M|P|A{1,4})";
  // standard shorthand notation (with quality before number)
  var IVL_STR = "(AA|A|P|M|m|d|dd)([-+]?\\d+)";
  var REGEX$1 = new RegExp("^" + IVL_TNL + "|" + IVL_STR + "$");
  var SIZES = [0, 2, 4, 5, 7, 9, 11];
  var TYPES = "PMMPPMM";

  var tokenize$1 = function (str) {
    var m = REGEX$1.exec(str);
    return m === null ? null : m[1] ? [m[1], m[2]] : [m[4], m[3]];
  };

  var NO_IVL = Object.freeze({
    name: null,
    num: null,
    q: null,
    step: null,
    alt: null,
    dir: null,
    type: null,
    simple: null,
    semitones: null,
    chroma: null
  });

  var qToAlt = function (type, q) {
    if (q === "M" && type === "M") { return 0; }
    if (q === "P" && type === "P") { return 0; }
    if (q === "m" && type === "M") { return -1; }
    if (/^A+$/.test(q)) { return q.length; }
    if (/^d+$/.test(q)) { return type === "P" ? -q.length : -q.length - 1; }
    return null;
  };

  var numToStep = function (num) { return (Math.abs(num) - 1) % 7; };

  var properties$1 = function (str) {
    var t = tokenize$1(str);
    if (t === null) { return NO_IVL; }
    var p = { num: +t[0], q: t[1] };
    p.step = numToStep(p.num);
    p.type = TYPES[p.step];
    if (p.type === "M" && p.q === "P") { return NO_IVL; }

    p.name = "" + p.num + p.q;
    p.dir = p.num < 0 ? -1 : 1;
    p.simple = p.num === 8 || p.num === -8 ? p.num : p.dir * (p.step + 1);
    p.alt = qToAlt(p.type, p.q);
    p.oct = Math.floor((Math.abs(p.num) - 1) / 7);
    p.semitones = p.dir * (SIZES[p.step] + p.alt + 12 * p.oct);
    p.chroma = ((p.dir * (SIZES[p.step] + p.alt)) % 12 + 12) % 12;
    return Object.freeze(p);
  };

  var cache = {};
  /**
   * Get interval properties. It returns an object with:
   *
   * - name: name
   * - num: number
   * - q: quality
   * - step: step
   * - alt: alteration
   * - dir: direction (1 ascending, -1 descending)
   * - type: "P" or "M" for perfectable or majorable
   * - simple: the simplified number
   * - semitones: the size in semitones
   * - chroma: the interval chroma
   * - ic: the interval class
   *
   * @function
   * @param {String} interval - the interval
   * @return {Object} the interval in the form [number, alt]
   */
  function props$1(str) {
    if (typeof str !== "string") { return NO_IVL; }
    return cache[str] || (cache[str] = properties$1(str));
  }

  /**
   * Get the chroma of the interval. The chroma is a number between 0 and 7
   * that represents the position within an octave (pitch set)
   *
   * @function
   * @param {String} str
   * @return {Number}
   */
  var chroma$1 = function (str) { return props$1(str).chroma; };

  /**
   * [![npm version](https://img.shields.io/npm/v/tonal-array.svg?style=flat-square)](https://www.npmjs.com/package/tonal-array)
   *
   * Tonal array utilities. Create ranges, sort notes, ...
   *
   * @example
   * import * as Array;
   * Array.sort(["f", "a", "c"]) // => ["C", "F", "A"]
   *
   * @example
   * const Array = require("tonal-array)
   * Array.range(1, 4) // => [1, 2, 3, 4]
   *
   * @module Array
   */
  /**
   *
   * Rotates a list a number of times. It"s completly agnostic about the
   * contents of the list.
   *
   * @param {Integer} times - the number of rotations
   * @param {Array} array
   * @return {Array} the rotated array
   * @example
   * Array.rotate(1, [1, 2, 3]) // => [2, 3, 1]
   */
  function rotate(times, arr) {
    var len = arr.length;
    var n = (times % len + len) % len;
    return arr.slice(n, len).concat(arr.slice(0, n));
  }

  /**
   * Return a copy of the array with the null values removed
   * @function
   * @param {Array} array
   * @return {Array}
   *
   * @example
   * Array.compact(["a", "b", null, "c"]) // => ["a", "b", "c"]
   */
  var compact = function (arr) { return arr.filter(function (n) { return n === 0 || n; }); };

  // a function that get note heights (with negative number for pitch classes)
  var height = function (n) {
    var m = midi(n);
    return m !== null ? m : midi(n + "-100");
  };

  /**
   * Sort an array of notes in ascending order
   *
   * @param {String|Array} notes
   * @return {Array} sorted array of notes
   */
  function sort(src) {
    return compact(src.map(name)).sort(function (a, b) { return height(a) > height(b); });
  }

  /**
   * [![npm version](https://img.shields.io/npm/v/tonal-pcset.svg?style=flat-square)](https://www.npmjs.com/package/tonal-pcset)
   * [![tonal](https://img.shields.io/badge/tonal-pcset-yellow.svg?style=flat-square)](https://www.npmjs.com/browse/keyword/tonal)
   *
   * `tonal-pcset` is a collection of functions to work with pitch class sets, oriented
   * to make comparations (isEqual, isSubset, isSuperset)
   *
   * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
   *
   * You can install via npm: `npm i --save tonal-pcset`
   *
   * ```js
   * // es6
   * import PcSet from "tonal-pcset"
   * var PcSet = require("tonal-pcset")
   *
   * PcSet.isEqual("c2 d5 e6", "c6 e3 d1") // => true
   * ```
   *
   * ## API documentation
   *
   * @module PcSet
   */

  var chr = function (str) { return chroma(str) || chroma$1(str) || 0; };

  /**
   * Get chroma of a pitch class set. A chroma identifies each set uniquely.
   * It"s a 12-digit binary each presenting one semitone of the octave.
   *
   * Note that this function accepts a chroma as parameter and return it
   * without modification.
   *
   * @param {Array|String} set - the pitch class set
   * @return {String} a binary representation of the pitch class set
   * @example
   * PcSet.chroma(["C", "D", "E"]) // => "1010100000000"
   */
  function chroma$2(set) {
    if (isChroma(set)) { return set; }
    if (!Array.isArray(set)) { return ""; }
    var b = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    set.map(chr).forEach(function (i) {
      b[i] = 1;
    });
    return b.join("");
  }

  /**
   * Given a a list of notes or a pcset chroma, produce the rotations
   * of the chroma discarding the ones that starts with "0"
   *
   * This is used, for example, to get all the modes of a scale.
   *
   * @param {Array|String} set - the list of notes or pitchChr of the set
   * @param {Boolean} normalize - (Optional, true by default) remove all
   * the rotations that starts with "0"
   * @return {Array<String>} an array with all the modes of the chroma
   *
   * @example
   * PcSet.modes(["C", "D", "E"]).map(PcSet.intervals)
   */
  function modes(set, normalize) {
    normalize = normalize !== false;
    var binary = chroma$2(set).split("");
    return compact(
      binary.map(function(_, i) {
        var r = rotate(i, binary);
        return normalize && r[0] === "0" ? null : r.join("");
      })
    );
  }

  var REGEX$2 = /^[01]{12}$/;
  /**
   * Test if the given string is a pitch class set chroma.
   * @param {String} chroma - the pitch class set chroma
   * @return {Boolean} true if its a valid pcset chroma
   * @example
   * PcSet.isChroma("101010101010") // => true
   * PcSet.isChroma("101001") // => false
   */
  function isChroma(set) {
    return REGEX$2.test(set);
  }

  /**
   * [![npm version](https://img.shields.io/npm/v/tonal-dictionary.svg)](https://www.npmjs.com/package/tonal-dictionary)
   *
   * `tonal-dictionary` contains a dictionary of musical scales and chords
   *
   * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
   *
   * @example
   * // es6
   * import * as Dictionary from "tonal-dictionary"
   * // es5
   * const Dictionary = require("tonal-dictionary")
   *
   * @example
   * Dictionary.chord("Maj7") // => ["1P", "3M", "5P", "7M"]
   *
   * @module Dictionary
   */

  var dictionary = function (raw) {
    var keys = Object.keys(raw).sort();
    var data = [];
    var index = [];

    var add = function (name, ivls, chroma) {
      data[name] = ivls;
      index[chroma] = index[chroma] || [];
      index[chroma].push(name);
    };

    keys.forEach(function (key) {
      var ivls = raw[key][0].split(" ");
      var alias = raw[key][1];
      var chr = chroma$2(ivls);

      add(key, ivls, chr);
      if (alias) { alias.forEach(function (a) { return add(a, ivls, chr); }); }
    });
    var allKeys = Object.keys(data).sort();

    var dict = function (name) { return data[name]; };
    dict.names = function (p) {
      if (typeof p === "string") { return (index[p] || []).slice(); }
      else { return (p === true ? allKeys : keys).slice(); }
    };
    return dict;
  };

  var combine = function (a, b) {
    var dict = function (name) { return a(name) || b(name); };
    dict.names = function (p) { return a.names(p).concat(b.names(p)); };
    return dict;
  };

  /**
   * A dictionary of scales: a function that given a scale name (without tonic)
   * returns an array of intervals
   *
   * @function
   * @param {String} name
   * @return {Array} intervals
   * @example
   * import { scale } from "tonal-dictionary"
   * scale("major") // => ["1P", "2M", ...]
   * scale.names(); // => ["major", ...]
   */
  var scale = dictionary(sdata);

  /**
   * A dictionary of chords: a function that given a chord type
   * returns an array of intervals
   *
   * @function
   * @param {String} type
   * @return {Array} intervals
   * @example
   * import { chord } from "tonal-dictionary"
   * chord("Maj7") // => ["1P", "3M", ...]
   * chord.names(); // => ["Maj3", ...]
   */
  var chord = dictionary(cdata);
  var pcset = combine(scale, chord);

  /**
   * [![npm version](https://img.shields.io/npm/v/tonal-detect.svg?style=flat-square)](https://www.npmjs.com/package/tonal-detect)
   *
   * Find chord and scale names from a collection of notes or pitch classes
   *
   * This is part of [tonal](https://www.npmjs.com/package/tonal) music theory library.
   *
   * @example
   * import { chord } from "tonal-detect"
   * chord(["C", "E", "G", "A"]) // => ["CM6", "Am7"]
   *
   * @example
   * const Detect = require("tonal-detect")
   * Detect.chord(["C", "E", "G", "A"]) // => ["CM6", "Am7"]
   *
   * @module Detect
   */

  function detector(dictionary$$1, defaultBuilder) {
    defaultBuilder = defaultBuilder || (function (tonic, names$$1) { return [tonic, names$$1]; });
    return function(notes, builder) {
      builder = builder || defaultBuilder;
      notes = sort(notes.map(pc));
      return modes(notes)
        .map(function (mode, i) {
          var tonic = name(notes[i]);
          var names$$1 = dictionary$$1.names(mode);
          return names$$1.length ? builder(tonic, names$$1) : null;
        })
        .filter(function (x) { return x; });
    };
  }

  /**
   * Given a collection of notes or pitch classes, try to find the chord name
   * @function
   * @param {Array<String>} notes
   * @return {Array<String>} chord names or empty array
   * @example
   * Detect.chord(["C", "E", "G", "A"]) // => ["CM6", "Am7"]
   */
  var chord$1 = detector(
    chord,
    function (tonic, names$$1) { return tonic + names$$1[0]; }
  );

  /**
   * Given a collection of notes or pitch classes, try to find the scale names
   * @function
   * @param {Array<String>} notes
   * @return {Array<String>} scale names or empty array
   * @example
   * Detect.scale(["f3", "a", "c5", "e2", "d", "g2", "b6"]) // => [
   * "C major",
   * "D dorian",
   * "E phrygian",
   * "F lydian",
   * "G mixolydian",
   * "A aeolian",
   * "B locrian"
   * ]
   */
  var scale$1 = detector(
    scale,
    function (tonic, names$$1) { return tonic + " " + names$$1[0]; }
  );

  var pcset$1 = detector(pcset);

  const harmony = {
      chord: chord$1 
  };

  exports.harmony = harmony;

  Object.defineProperty(exports, '__esModule', { value: true });

})));

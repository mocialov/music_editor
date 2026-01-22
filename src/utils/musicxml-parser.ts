/**
 * MusicXML Parser for TypeScript
 * Zod-based schema validation matching the Python Pydantic parser
 */

import { z } from 'zod';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

// ============================================================================
// Zod Schemas (matching Pydantic models)
// ============================================================================

export const EncodingSchema = z.object({
  software: z.union([z.string(), z.array(z.string())]).optional(),
  'encoding-date': z.string().optional(),
  encoder: z.string().optional(),
  'encoding-description': z.string().optional(),
  supports: z.union([z.array(z.record(z.string(), z.any())), z.record(z.string(), z.any())]).optional(),
}).passthrough();

export const CreatorSchema = z.object({
  '@type': z.string().optional(),
  '#text': z.string(),
}).passthrough();

export const IdentificationSchema = z.object({
  creator: z.union([CreatorSchema, z.string(), z.array(z.union([CreatorSchema, z.string()]))]).optional(),
  rights: z.union([z.string(), z.number()]).optional(),
  encoding: EncodingSchema.optional(),
  source: z.string().optional(),
}).passthrough();

export const ScalingSchema = z.object({
  millimeters: z.union([z.number(), z.string()]),
  tenths: z.union([z.number(), z.string()]),
}).passthrough();

export const PageMarginsSchema = z.object({
  '@type': z.string(),
  'left-margin': z.union([z.number(), z.string()]),
  'right-margin': z.union([z.number(), z.string()]),
  'top-margin': z.union([z.number(), z.string()]),
  'bottom-margin': z.union([z.number(), z.string()]),
}).passthrough();

export const PageLayoutSchema = z.object({
  'page-height': z.union([z.number(), z.string()]).optional(),
  'page-width': z.union([z.number(), z.string()]).optional(),
  'page-margins': z.union([PageMarginsSchema, z.array(PageMarginsSchema)]).optional(),
}).passthrough();

export const SystemMarginsSchema = z.object({
  'left-margin': z.union([z.number(), z.string()]),
  'right-margin': z.union([z.number(), z.string()]),
}).passthrough();

export const SystemLayoutSchema = z.object({
  'system-margins': SystemMarginsSchema.optional(),
  'system-distance': z.union([z.number(), z.string()]).optional(),
  'top-system-distance': z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const StaffLayoutSchema = z.object({
  '@number': z.union([z.number(), z.string()]).optional(),
  'staff-distance': z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const AppearanceSchema = z.object({
  'line-width': z.union([z.array(z.record(z.string(), z.any())), z.record(z.string(), z.any())]).optional(),
  'note-size': z.union([z.array(z.record(z.string(), z.any())), z.record(z.string(), z.any())]).optional(),
}).passthrough();

export const DefaultsSchema = z.object({
  scaling: ScalingSchema.optional(),
  'page-layout': PageLayoutSchema.optional(),
  'system-layout': SystemLayoutSchema.optional(),
  'staff-layout': z.union([StaffLayoutSchema, z.array(StaffLayoutSchema)]).optional(),
  appearance: AppearanceSchema.optional(),
  'music-font': z.record(z.string(), z.any()).optional(),
  'word-font': z.record(z.string(), z.any()).optional(),
  'lyric-font': z.record(z.string(), z.any()).optional(),
}).passthrough();

export const CreditWordsSchema = z.object({
  '@default-x': z.union([z.number(), z.string()]).optional(),
  '@default-y': z.union([z.number(), z.string()]).optional(),
  '@font-size': z.union([z.number(), z.string()]).optional(),
  '@font-family': z.string().optional(),
  '@font-weight': z.string().optional(),
  '@justify': z.string().optional(),
  '@halign': z.string().optional(),
  '@valign': z.string().optional(),
  '#text': z.string().optional(),
}).passthrough();

export const CreditSchema = z.object({
  '@page': z.string().optional(),
  'credit-words': z.union([CreditWordsSchema, z.array(z.union([CreditWordsSchema, z.string()])), z.string()]),
}).passthrough();

export const PartGroupSchema = z.object({
  '@type': z.string(),
  '@number': z.string(),
  'group-symbol': z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  'group-barline': z.string().optional(),
}).passthrough();

export const ScoreInstrumentSchema = z.object({
  '@id': z.string(),
  'instrument-name': z.string(),
}).passthrough();

export const MidiDeviceSchema = z.object({
  '@id': z.string().optional(),
  '@port': z.string().optional(),
}).passthrough();

export const MidiInstrumentSchema = z.object({
  '@id': z.string(),
  'midi-channel': z.union([z.number(), z.string()]).optional(),
  'midi-program': z.union([z.number(), z.string()]).optional(),
  volume: z.union([z.number(), z.string()]).optional(),
  pan: z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const ScorePartSchema = z.object({
  '@id': z.string(),
  'part-name': z.string(),
  'part-abbreviation': z.string().optional(),
  'score-instrument': z.union([ScoreInstrumentSchema, z.array(ScoreInstrumentSchema)]).optional(),
  'midi-device': z.union([MidiDeviceSchema, z.array(MidiDeviceSchema)]).optional(),
  'midi-instrument': z.union([MidiInstrumentSchema, z.array(MidiInstrumentSchema)]).optional(),
}).passthrough();

export const PartListSchema = z.object({
  'part-group': z.union([PartGroupSchema, z.array(PartGroupSchema)]).optional(),
  'score-part': z.union([ScorePartSchema, z.array(ScorePartSchema)]),
}).passthrough();

export const KeySchema = z.object({
  fifths: z.union([z.number(), z.string()]),
  mode: z.string().optional(),
}).passthrough();

export const TimeSchema = z.object({
  '@symbol': z.string().optional(),
  beats: z.union([z.number(), z.string()]),
  'beat-type': z.union([z.number(), z.string()]),
}).passthrough();

export const ClefSchema = z.object({
  '@number': z.string().optional(),
  sign: z.string(),
  line: z.union([z.number(), z.string()]),
  'clef-octave-change': z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const TransposeSchema = z.object({
  diatonic: z.union([z.number(), z.string()]).optional(),
  chromatic: z.union([z.number(), z.string()]),
}).passthrough();

export const AttributesSchema = z.object({
  divisions: z.union([z.number(), z.string()]).optional(),
  key: KeySchema.optional(),
  time: TimeSchema.optional(),
  staves: z.union([z.number(), z.string()]).optional(),
  'part-symbol': z.string().optional(),
  instruments: z.union([z.number(), z.string()]).optional(),
  clef: z.union([ClefSchema, z.array(ClefSchema)]).optional(),
  'staff-details': z.any().optional(),
  transpose: TransposeSchema.optional(),
  directive: z.any().optional(),
  'measure-style': z.any().optional(),
}).passthrough();

export const PitchSchema = z.object({
  step: z.string(),
  alter: z.union([z.number(), z.string()]).optional(),
  octave: z.union([z.number(), z.string()]),
}).passthrough();

export const UnpitchedSchema = z.object({
  'display-step': z.string().optional(),
  'display-octave': z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const RestSchema = z.object({
  '@measure': z.string().optional(),
  'display-step': z.string().optional(),
  'display-octave': z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const LyricSchema = z.object({
  '@number': z.string().optional(),
  '@name': z.string().optional(),
  syllabic: z.string().optional(),
  text: z.string(),
  elision: z.any().optional(),
  extend: z.any().optional(),
}).passthrough();

export const BeamSchema = z.object({
  '@number': z.string(),
  '#text': z.string(),
}).passthrough();

export const NotationsSchema = z.object({
  tied: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  slur: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  tuplet: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  glissando: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  slide: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  ornaments: z.record(z.string(), z.any()).optional(),
  technical: z.record(z.string(), z.any()).optional(),
  articulations: z.record(z.string(), z.any()).optional(),
  dynamics: z.record(z.string(), z.any()).optional(),
  fermata: z.any().optional(),
  arpeggiate: z.union([z.record(z.string(), z.any()), z.string()]).optional(),
  'non-arpeggiate': z.union([z.record(z.string(), z.any()), z.string()]).optional(),
}).passthrough();

export const TimeModificationSchema = z.object({
  'actual-notes': z.union([z.number(), z.string()]),
  'normal-notes': z.union([z.number(), z.string()]),
  'normal-type': z.string().optional(),
}).passthrough();

export const NoteSchema = z.object({
  // Attributes
  '@default-x': z.string().optional(),
  '@default-y': z.string().optional(),
  '@relative-x': z.string().optional(),
  '@relative-y': z.string().optional(),
  '@font-size': z.string().optional(),
  '@color': z.string().optional(),
  '@print-object': z.string().optional(),
  
  // Elements
  chord: z.any().optional(),
  pitch: PitchSchema.optional(),
  unpitched: UnpitchedSchema.optional(),
  rest: z.union([RestSchema, z.any()]).optional(),
  duration: z.union([z.number(), z.string()]).optional(),
  voice: z.union([z.number(), z.string()]),
  type: z.string().optional(),
  dot: z.union([z.any(), z.array(z.any())]).optional(),
  accidental: z.string().optional(),
  'time-modification': TimeModificationSchema.optional(),
  stem: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  notehead: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  staff: z.union([z.number(), z.string()]).optional(),
  beam: z.union([BeamSchema, z.array(BeamSchema)]).optional(),
  notations: NotationsSchema.optional(),
  lyric: z.union([LyricSchema, z.array(LyricSchema)]).optional(),
  grace: z.any().optional(),
  cue: z.any().optional(),
}).passthrough();

export const BackupSchema = z.object({
  duration: z.union([z.number(), z.string()]),
}).passthrough();

export const ForwardSchema = z.object({
  duration: z.union([z.number(), z.string()]),
  voice: z.union([z.number(), z.string()]).optional(),
  staff: z.union([z.number(), z.string()]).optional(),
}).passthrough();

export const DynamicsSchema = z.object({
  // Common dynamics
  p: z.any().optional(),
  pp: z.any().optional(),
  ppp: z.any().optional(),
  f: z.any().optional(),
  ff: z.any().optional(),
  fff: z.any().optional(),
  mp: z.any().optional(),
  mf: z.any().optional(),
  sf: z.any().optional(),
  sfz: z.any().optional(),
  fp: z.any().optional(),
  'other-dynamics': z.string().optional(),
  
  // Attributes
  '@default-x': z.string().optional(),
  '@default-y': z.string().optional(),
  '@relative-x': z.string().optional(),
  '@relative-y': z.string().optional(),
}).passthrough();

export const WedgeSchema = z.object({
  '@type': z.string(),
  '@number': z.string().optional(),
  '@default-x': z.string().optional(),
  '@default-y': z.string().optional(),
}).passthrough();

export const WordsSchema = z.object({
  '#text': z.string(),
  '@default-x': z.string().optional(),
  '@default-y': z.string().optional(),
  '@font-size': z.string().optional(),
  '@font-weight': z.string().optional(),
  '@font-family': z.string().optional(),
}).passthrough();

export const MetronomeSchema = z.object({
  'beat-unit': z.string(),
  'per-minute': z.union([z.number(), z.string()]),
}).passthrough();

export const DirectionTypeSchema = z.object({
  dynamics: DynamicsSchema.optional(),
  wedge: WedgeSchema.optional(),
  words: z.union([WordsSchema, z.string(), z.array(z.union([WordsSchema, z.string()]))]).optional(),
  metronome: MetronomeSchema.optional(),
  rehearsal: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  segno: z.any().optional(),
  coda: z.any().optional(),
  pedal: z.record(z.string(), z.any()).optional(),
  dashes: z.record(z.string(), z.any()).optional(),
  bracket: z.record(z.string(), z.any()).optional(),
  'octave-shift': z.record(z.string(), z.any()).optional(),
}).passthrough();

export const SoundSchema = z.object({
  '@tempo': z.union([z.number(), z.string()]).optional(),
  '@dynamics': z.union([z.number(), z.string()]).optional(),
  '@dacapo': z.string().optional(),
  '@segno': z.string().optional(),
  '@dalsegno': z.string().optional(),
  '@coda': z.string().optional(),
  '@tocoda': z.string().optional(),
  '@divisions': z.union([z.number(), z.string()]).optional(),
  '@forward-repeat': z.string().optional(),
}).passthrough();

export const DirectionSchema = z.object({
  '@placement': z.string().optional(),
  '@directive': z.string().optional(),
  'direction-type': z.union([DirectionTypeSchema, z.array(DirectionTypeSchema)]),
  offset: z.union([z.number(), z.string(), z.record(z.string(), z.any())]).optional(),
  staff: z.union([z.number(), z.string()]).optional(),
  sound: SoundSchema.optional(),
}).passthrough();

export const BarlineSchema = z.object({
  '@location': z.string().optional(),
  'bar-style': z.string().optional(),
  ending: z.record(z.string(), z.any()).optional(),
  repeat: z.record(z.string(), z.any()).optional(),
  fermata: z.any().optional(),
}).passthrough();

export const PrintSchema = z.object({
  '@new-system': z.string().optional(),
  '@new-page': z.string().optional(),
  '@blank-page': z.string().optional(),
  '@page-number': z.string().optional(),
  'system-layout': SystemLayoutSchema.optional(),
  'staff-layout': z.union([StaffLayoutSchema, z.array(StaffLayoutSchema), z.string()]).optional(),
  'measure-layout': z.record(z.string(), z.any()).optional(),
  'measure-numbering': z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  'part-name-display': z.record(z.string(), z.any()).optional(),
  'part-abbreviation-display': z.record(z.string(), z.any()).optional(),
}).passthrough();

export const MeasureSchema = z.object({
  '@number': z.string(),
  '@width': z.string().optional(),
  '@implicit': z.string().optional(),
  
  // Elements
  print: PrintSchema.optional(),
  attributes: z.union([AttributesSchema, z.array(AttributesSchema)]).optional(),
  direction: z.union([DirectionSchema, z.array(DirectionSchema)]).optional(),
  note: z.union([NoteSchema, z.array(NoteSchema)]).optional(),
  backup: z.union([BackupSchema, z.array(BackupSchema)]).optional(),
  forward: z.union([ForwardSchema, z.array(ForwardSchema)]).optional(),
  barline: z.union([BarlineSchema, z.array(BarlineSchema)]).optional(),
  sound: z.union([SoundSchema, z.array(SoundSchema)]).optional(),
  harmony: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  'figured-bass': z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  link: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
  bookmark: z.union([z.record(z.string(), z.any()), z.array(z.record(z.string(), z.any()))]).optional(),
}).passthrough();

export const PartSchema = z.object({
  '@id': z.string(),
  measure: z.array(MeasureSchema),
}).passthrough();

export const ScorePartwiseSchema = z.object({
  '@version': z.string().optional(),
  'movement-number': z.string().optional(),
  'movement-title': z.union([z.string(), z.any()]).optional(),
  identification: IdentificationSchema.optional(),
  defaults: DefaultsSchema.optional(),
  credit: z.union([CreditSchema, z.array(CreditSchema)]).optional(),
  'part-list': PartListSchema,
  part: z.union([PartSchema, z.array(PartSchema)]),
}).passthrough();

export const MusicXMLDocumentSchema = z.object({
  'score-partwise': ScorePartwiseSchema,
}).passthrough();

// ============================================================================
// Type Exports (inferred from Zod schemas)
// ============================================================================

export type Encoding = z.infer<typeof EncodingSchema>;
export type Creator = z.infer<typeof CreatorSchema>;
export type Identification = z.infer<typeof IdentificationSchema>;
export type Scaling = z.infer<typeof ScalingSchema>;
export type PageMargins = z.infer<typeof PageMarginsSchema>;
export type PageLayout = z.infer<typeof PageLayoutSchema>;
export type SystemMargins = z.infer<typeof SystemMarginsSchema>;
export type SystemLayout = z.infer<typeof SystemLayoutSchema>;
export type StaffLayout = z.infer<typeof StaffLayoutSchema>;
export type Appearance = z.infer<typeof AppearanceSchema>;
export type Defaults = z.infer<typeof DefaultsSchema>;
export type CreditWords = z.infer<typeof CreditWordsSchema>;
export type Credit = z.infer<typeof CreditSchema>;
export type PartGroup = z.infer<typeof PartGroupSchema>;
export type ScoreInstrument = z.infer<typeof ScoreInstrumentSchema>;
export type MidiDevice = z.infer<typeof MidiDeviceSchema>;
export type MidiInstrument = z.infer<typeof MidiInstrumentSchema>;
export type ScorePart = z.infer<typeof ScorePartSchema>;
export type PartList = z.infer<typeof PartListSchema>;
export type Key = z.infer<typeof KeySchema>;
export type Time = z.infer<typeof TimeSchema>;
export type Clef = z.infer<typeof ClefSchema>;
export type Transpose = z.infer<typeof TransposeSchema>;
export type Attributes = z.infer<typeof AttributesSchema>;
export type Pitch = z.infer<typeof PitchSchema>;
export type Unpitched = z.infer<typeof UnpitchedSchema>;
export type Rest = z.infer<typeof RestSchema>;
export type Lyric = z.infer<typeof LyricSchema>;
export type Beam = z.infer<typeof BeamSchema>;
export type Notations = z.infer<typeof NotationsSchema>;
export type TimeModification = z.infer<typeof TimeModificationSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type Backup = z.infer<typeof BackupSchema>;
export type Forward = z.infer<typeof ForwardSchema>;
export type Dynamics = z.infer<typeof DynamicsSchema>;
export type Wedge = z.infer<typeof WedgeSchema>;
export type Words = z.infer<typeof WordsSchema>;
export type Metronome = z.infer<typeof MetronomeSchema>;
export type DirectionType = z.infer<typeof DirectionTypeSchema>;
export type Sound = z.infer<typeof SoundSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export type Barline = z.infer<typeof BarlineSchema>;
export type Print = z.infer<typeof PrintSchema>;
export type Measure = z.infer<typeof MeasureSchema>;
export type Part = z.infer<typeof PartSchema>;
export type ScorePartwise = z.infer<typeof ScorePartwiseSchema>;
export type MusicXMLDocument = z.infer<typeof MusicXMLDocumentSchema>;

// ============================================================================
// Semantic Format (LLM-Friendly Compact Representation)
// ============================================================================

// Zod Schemas for Semantic Format (for validation)

export const SemanticPitchSchema = z.object({
  step: z.string(),
  alter: z.number().optional(),
  octave: z.number(),
});

export const SemanticTupletSchema = z.object({
  actualNotes: z.number(),
  normalNotes: z.number(),
});

// Helper to coerce boolean values from LLM output
const coerceBoolean = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    return undefined;
  }
  if (typeof val === 'number') return val !== 0;
  // For objects or other types (common LLM mistake), treat as undefined
  if (typeof val === 'object') return undefined;
  return undefined;
}, z.boolean().optional());

export const SemanticNoteSchema = z.object({
  pitch: SemanticPitchSchema.optional(),
  duration: z.number(),
  type: z.string().optional(),
  dots: z.number().optional(),
  voice: z.number(),
  staff: z.number().optional(),
  chord: coerceBoolean,
  accidental: z.string().optional(),
  articulations: z.array(z.string()).optional(),
  ornaments: z.array(z.string()).optional(),
  dynamics: z.string().optional(),
  lyric: z.string().optional(),
  tuplet: SemanticTupletSchema.optional(),
  tie: z.enum(['start', 'stop', 'continue']).optional(),
  slur: z.enum(['start', 'stop']).optional(),
  grace: coerceBoolean,
});

export const SemanticAttributesSchema = z.object({
  divisions: z.number().optional(),
  key: z.object({
    fifths: z.number(),
    mode: z.string().optional(),
  }).optional(),
  time: z.object({
    beats: z.number(),
    beatType: z.number(),
  }).optional(),
  clef: z.array(z.object({
    sign: z.string(),
    line: z.number(),
    staff: z.number().optional(),
  })).optional(),
  transpose: z.object({
    chromatic: z.number(),
    diatonic: z.number().optional(),
  }).optional(),
});

export const SemanticDirectionSchema = z.object({
  type: z.string(),
  value: z.union([z.string(), z.number()]).optional(),
  staff: z.number().optional(),
});

export const SemanticBarlineSchema = z.object({
  location: z.string().optional(),
  style: z.string().optional(),
  repeat: z.string().optional(),
});

export const SemanticMeasureSchema = z.object({
  number: z.number(),
  attributes: SemanticAttributesSchema.optional(),
  directions: z.array(SemanticDirectionSchema).optional(),
  notes: z.array(SemanticNoteSchema),
  barline: SemanticBarlineSchema.optional(),
});

export const SemanticPartSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string().optional(),
  instrument: z.string().optional(),
  midiProgram: z.number().optional(),
  midiChannel: z.number().optional(),
  measures: z.array(SemanticMeasureSchema),
});

export const SemanticMusicXMLSchema = z.object({
  version: z.string().optional(),
  title: z.string().optional(),
  composer: z.string().optional(),
  defaults: z.object({
    divisions: z.number().optional(),
    tempo: z.number().optional(),
  }).optional(),
  parts: z.array(SemanticPartSchema),
});

// TypeScript types inferred from Zod schemas
export type SemanticPitch = z.infer<typeof SemanticPitchSchema>;
export type SemanticTuplet = z.infer<typeof SemanticTupletSchema>;
export type SemanticNote = z.infer<typeof SemanticNoteSchema>;
export type SemanticAttributes = z.infer<typeof SemanticAttributesSchema>;
export type SemanticDirection = z.infer<typeof SemanticDirectionSchema>;
export type SemanticBarline = z.infer<typeof SemanticBarlineSchema>;
export type SemanticMeasure = z.infer<typeof SemanticMeasureSchema>;
export type SemanticPart = z.infer<typeof SemanticPartSchema>;
export type SemanticMusicXML = z.infer<typeof SemanticMusicXMLSchema>;

// ============================================================================
// Parser Configuration
// ============================================================================

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  parseAttributeValue: false, // Keep as strings to match schema
  parseTagValue: true, // Still parse element values as numbers
  trimValues: true,
  ignoreDeclaration: true,
  ignorePiTags: true,
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: false,
};

// ============================================================================
// Parser Class
// ============================================================================

export class MusicXMLParser {
  private xmlParser: XMLParser;
  private xmlBuilder: XMLBuilder;

  constructor() {
    this.xmlParser = new XMLParser(parserOptions);
    this.xmlBuilder = new XMLBuilder(builderOptions);
  }

  /**
   * Parse MusicXML string to validated TypeScript object
   * @param xmlString - MusicXML file content
   * @returns Validated MusicXML document
   */
  parse(xmlString: string): MusicXMLDocument {
    // Parse XML to JSON
    const jsonObj = this.xmlParser.parse(xmlString);
    
    // Validate with Zod schema
    const validated = MusicXMLDocumentSchema.parse(jsonObj);
    
    return validated;
  }

  /**
   * Parse MusicXML file from File object
   * @param file - File object from file input
   * @returns Promise with validated MusicXML document
   */
  async parseFile(file: File): Promise<MusicXMLDocument> {
    const xmlString = await file.text();
    return this.parse(xmlString);
  }

  /**
   * Convert validated MusicXML object back to XML string
   * @param document - Validated MusicXML document
   * @returns XML string
   */
  toXML(document: MusicXMLDocument): string {
    // Add XML declaration
    const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const xmlString = this.xmlBuilder.build(document);
    return xmlDeclaration + xmlString;
  }

  /**
   * Validate a MusicXML object without parsing from XML
   * Useful for validating LLM output
   * @param obj - Object to validate
   * @returns Validated MusicXML document or throws error
   */
  validate(obj: unknown): MusicXMLDocument {
    return MusicXMLDocumentSchema.parse(obj);
  }

  /**
   * Safe validation that returns result object instead of throwing
   * @param obj - Object to validate
   * @returns Result object with success status and data or error
   */
  safeParse(obj: unknown) {
    return MusicXMLDocumentSchema.safeParse(obj);
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Parse MusicXML string (convenience function)
 */
export function parseMusicXML(xmlString: string): MusicXMLDocument {
  const parser = new MusicXMLParser();
  return parser.parse(xmlString);
}

/**
 * Convert MusicXML object to XML string (convenience function)
 */
export function musicXMLToString(document: MusicXMLDocument): string {
  const parser = new MusicXMLParser();
  return parser.toXML(document);
}

/**
 * Validate MusicXML object (convenience function for LLM output validation)
 */
export function validateMusicXML(obj: unknown): MusicXMLDocument {
  const parser = new MusicXMLParser();
  return parser.validate(obj);
}

// ============================================================================
// Semantic Parser Class
// ============================================================================

/**
 * Parser for Semantic MusicXML format
 * Used to validate LLM output before converting back to full MusicXML
 */
export class SemanticMusicXMLParser {
  /**
   * Validate semantic MusicXML object
   * @param obj - Object to validate (typically from LLM)
   * @returns Validated semantic MusicXML document or throws error
   */
  validate(obj: unknown): SemanticMusicXML {
    return SemanticMusicXMLSchema.parse(obj);
  }

  /**
   * Safe validation that returns result object instead of throwing
   * @param obj - Object to validate
   * @returns Result object with success status and data or error
   */
  safeParse(obj: unknown) {
    return SemanticMusicXMLSchema.safeParse(obj);
  }

  /**
   * Parse JSON string to validated semantic MusicXML
   * @param jsonString - JSON string (from LLM response)
   * @returns Validated semantic MusicXML document
   */
  parseJSON(jsonString: string): SemanticMusicXML {
    const obj = JSON.parse(jsonString);
    return this.validate(obj);
  }

  /**
   * Safe JSON parsing that returns result object
   * @param jsonString - JSON string to parse
   * @returns Result object with success status and data or error
   */
  safeParseJSON(jsonString: string) {
    try {
      const obj = JSON.parse(jsonString);
      return this.safeParse(obj);
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error : new Error('JSON parse failed'),
      };
    }
  }

  /**
   * Convert semantic format to full MusicXML and validate
   * @param semantic - Semantic MusicXML object
   * @returns Validated full MusicXML document
   */
  toMusicXML(semantic: SemanticMusicXML): MusicXMLDocument {
    // First validate semantic format
    const validated = this.validate(semantic);
    
    // Decode to full MusicXML
    const fullDocument = decodeFromSemantic(validated);
    
    // Validate the resulting MusicXML
    const musicXMLParser = new MusicXMLParser();
    return musicXMLParser.validate(fullDocument);
  }

  /**
   * Safe conversion to MusicXML with error handling
   * @param semantic - Semantic MusicXML object
   * @returns Result object with success status and data or error
   */
  safeToMusicXML(semantic: SemanticMusicXML) {
    try {
      return {
        success: true as const,
        data: this.toMusicXML(semantic),
      };
    } catch (error) {
      return {
        success: false as const,
        error: error instanceof Error ? error : new Error('Conversion failed'),
      };
    }
  }
}

// ============================================================================
// Semantic Convenience Functions
// ============================================================================

/**
 * Validate semantic MusicXML object (convenience function for LLM output)
 */
export function validateSemanticMusicXML(obj: unknown): SemanticMusicXML {
  const parser = new SemanticMusicXMLParser();
  return parser.validate(obj);
}

/**
 * Parse semantic JSON string from LLM
 */
export function parseSemanticJSON(jsonString: string): SemanticMusicXML {
  const parser = new SemanticMusicXMLParser();
  return parser.parseJSON(jsonString);
}

/**
 * Complete workflow: Validate LLM output and convert to MusicXML
 * @param llmOutput - Object or JSON string from LLM
 * @returns Full validated MusicXML document ready for playback
 */
export function processLLMOutput(llmOutput: unknown): MusicXMLDocument {
  const parser = new SemanticMusicXMLParser();
  
  // Handle both string and object input
  let semantic: SemanticMusicXML;
  if (typeof llmOutput === 'string') {
    semantic = parser.parseJSON(llmOutput);
  } else {
    semantic = parser.validate(llmOutput);
  }
  
  // Convert to full MusicXML
  return parser.toMusicXML(semantic);
}

// ============================================================================
// Measure Range Extraction and Replacement
// ============================================================================

/**
 * Extract a range of measures from a MusicXML document
 * @param document - Full MusicXML document
 * @param startMeasure - Starting measure number (1-based, inclusive)
 * @param endMeasure - Ending measure number (1-based, inclusive)
 * @param partId - Optional part ID to extract only specific part (e.g., 'P1', 'P2')
 * @returns New MusicXML document containing only the specified measures
 */
export function extractMeasureRange(
  document: MusicXMLDocument,
  startMeasure: number,
  endMeasure: number,
  partId?: string
): MusicXMLDocument {
  const score = document['score-partwise'];
  const allParts = Array.isArray(score.part) ? score.part : [score.part];
  
  // Filter parts if partId is specified
  const parts = partId 
    ? allParts.filter(p => p['@id'] === partId)
    : allParts;
  
  // Extract measures from each part
  const extractedParts: Part[] = parts.map(part => {
    const filteredMeasures = part.measure.filter(measure => {
      const measureNum = Number(measure['@number']);
      return measureNum >= startMeasure && measureNum <= endMeasure;
    });
    
    return {
      '@id': part['@id'],
      measure: filteredMeasures,
    };
  });
  
  // Create new document with extracted measures
  const newScore: ScorePartwise = {
    ...score,
    part: extractedParts.length === 1 ? extractedParts[0] : extractedParts,
  };
  
  return {
    'score-partwise': newScore,
  };
}

/**
 * Extract a range of measures from semantic MusicXML
 * @param semantic - Semantic MusicXML document
 * @param startMeasure - Starting measure number (1-based, inclusive)
 * @param endMeasure - Ending measure number (1-based, inclusive)
 * @returns New semantic document containing only the specified measures
 */
export function extractSemanticMeasureRange(
  semantic: SemanticMusicXML,
  startMeasure: number,
  endMeasure: number
): SemanticMusicXML {
  const extractedParts: SemanticPart[] = semantic.parts.map(part => {
    const filteredMeasures = part.measures.filter(measure => {
      return measure.number >= startMeasure && measure.number <= endMeasure;
    });
    
    return {
      ...part,
      measures: filteredMeasures,
    };
  });
  
  return {
    ...semantic,
    parts: extractedParts,
  };
}

/**
 * Replace a range of measures in a MusicXML document
 * @param original - Original MusicXML document
 * @param replacement - MusicXML document containing replacement measures
 * @param startMeasure - Starting measure number to replace (1-based, inclusive)
 * @param endMeasure - Ending measure number to replace (1-based, inclusive)
 * @param partId - Optional part ID to replace only specific part
 * @returns New MusicXML document with replaced measures
 */
export function replaceMeasureRange(
  original: MusicXMLDocument,
  replacement: MusicXMLDocument,
  startMeasure: number,
  endMeasure: number,
  partId?: string
): MusicXMLDocument {
  const originalScore = original['score-partwise'];
  const replacementScore = replacement['score-partwise'];
  
  const originalParts = Array.isArray(originalScore.part) 
    ? originalScore.part 
    : [originalScore.part];
  const replacementParts = Array.isArray(replacementScore.part) 
    ? replacementScore.part 
    : [replacementScore.part];
  
  // Replace measures in each part
  const updatedParts: Part[] = originalParts.map((part, partIndex) => {
    // If partId is specified, only update that specific part
    if (partId && part['@id'] !== partId) {
      return part; // Keep this part unchanged
    }
    
    const replacementPart = replacementParts.find(p => p['@id'] === part['@id']) 
      || replacementParts[partIndex];
    
    if (!replacementPart) {
      return part; // No replacement for this part
    }
    
    // Split original measures into before, during, and after ranges
    const beforeMeasures = part.measure.filter(m => Number(m['@number']) < startMeasure);
    const afterMeasures = part.measure.filter(m => Number(m['@number']) > endMeasure);
    
    // Renumber replacement measures to match the target range
    const replacementMeasures = replacementPart.measure.map((measure, index) => {
      return {
        ...measure,
        '@number': String(startMeasure + index),
      };
    });
    
    // Combine measures
    const newMeasures = [...beforeMeasures, ...replacementMeasures, ...afterMeasures];
    
    return {
      '@id': part['@id'],
      measure: newMeasures,
    };
  });
  
  // Create new document
  const newScore: ScorePartwise = {
    ...originalScore,
    part: updatedParts.length === 1 ? updatedParts[0] : updatedParts,
  };
  
  return {
    'score-partwise': newScore,
  };
}

/**
 * Replace a range of measures in semantic MusicXML
 * @param original - Original semantic MusicXML document
 * @param replacement - Semantic MusicXML document containing replacement measures
 * @param startMeasure - Starting measure number to replace (1-based, inclusive)
 * @param endMeasure - Ending measure number to replace (1-based, inclusive)
 * @returns New semantic document with replaced measures
 */
export function replaceSemanticMeasureRange(
  original: SemanticMusicXML,
  replacement: SemanticMusicXML,
  startMeasure: number,
  endMeasure: number
): SemanticMusicXML {
  const updatedParts: SemanticPart[] = original.parts.map((part, partIndex) => {
    const replacementPart = replacement.parts.find(p => p.id === part.id) 
      || replacement.parts[partIndex];
    
    if (!replacementPart) {
      return part; // No replacement for this part
    }
    
    // Split original measures
    const beforeMeasures = part.measures.filter(m => m.number < startMeasure);
    const afterMeasures = part.measures.filter(m => m.number > endMeasure);
    
    // Renumber replacement measures
    const replacementMeasures = replacementPart.measures.map((measure, index) => {
      return {
        ...measure,
        number: startMeasure + index,
      };
    });
    
    return {
      ...part,
      measures: [...beforeMeasures, ...replacementMeasures, ...afterMeasures],
    };
  });
  
  return {
    ...original,
    parts: updatedParts,
  };
}

/**
 * Get information about all parts in a MusicXML document
 * @param document - MusicXML document
 * @returns Array of part information (id, name)
 */
export function getPartsInfo(document: MusicXMLDocument): Array<{ id: string; name: string }> {
  const score = document['score-partwise'];
  const partList = score['part-list'];
  const scoreParts = Array.isArray(partList['score-part']) 
    ? partList['score-part'] 
    : [partList['score-part']];
  
  return scoreParts.map(sp => ({
    id: sp['@id'],
    name: sp['part-name'],
  }));
}

/**
 * Get total number of measures in a MusicXML document
 * @param document - MusicXML document
 * @returns Number of measures (uses first part as reference)
 */
export function getTotalMeasures(document: MusicXMLDocument): number {
  const score = document['score-partwise'];
  const parts = Array.isArray(score.part) ? score.part : [score.part];
  return parts[0]?.measure.length || 0;
}

/**
 * Get total number of measures in semantic MusicXML
 * @param semantic - Semantic MusicXML document
 * @returns Number of measures (uses first part as reference)
 */
export function getSemanticTotalMeasures(semantic: SemanticMusicXML): number {
  return semantic.parts[0]?.measures.length || 0;
}

/**
 * Merge new parts from semantic format into an existing document
 * Used when LLM adds new instruments/parts to the composition
 */
function mergePartsIntoDocument(
  original: MusicXMLDocument,
  modifiedSemantic: SemanticMusicXML
): MusicXMLDocument {
  const originalScore = original['score-partwise'];
  const originalPartList = originalScore['part-list'];
  const originalScoreParts = Array.isArray(originalPartList['score-part']) 
    ? originalPartList['score-part'] 
    : [originalPartList['score-part']];
  const originalParts = Array.isArray(originalScore.part) 
    ? originalScore.part 
    : [originalScore.part];
  const originalPartIds = new Set(originalScoreParts.map(sp => sp['@id']));
  
  // Separate existing and new parts from LLM response
  const existingParts: SemanticPart[] = [];
  const newParts: SemanticPart[] = [];
  
  modifiedSemantic.parts.forEach(part => {
    if (originalPartIds.has(part.id)) {
      existingParts.push(part);
    } else {
      newParts.push(part);
    }
  });
  
  console.log('Merging parts - existing:', existingParts.length, 'new:', newParts.length);
  
  // Build new score-parts for the new parts
  const newScoreParts: ScorePart[] = newParts.map(part => {
    const scorePart: ScorePart = {
      '@id': part.id,
      'part-name': part.name,
    };
    
    if (part.abbreviation) {
      scorePart['part-abbreviation'] = part.abbreviation;
    }
    
    if (part.instrument) {
      scorePart['score-instrument'] = {
        '@id': `${part.id}-I1`,
        'instrument-name': part.instrument,
      };
    }
    
    if (part.midiProgram !== undefined || part.midiChannel !== undefined) {
      scorePart['midi-instrument'] = {
        '@id': `${part.id}-I1`,
        'midi-channel': part.midiChannel || 1,
        'midi-program': part.midiProgram || 1,
      };
    }
    
    return scorePart;
  });
  
  // Build new Part objects for the new parts
  const newPartObjects: Part[] = newParts.map(semPart => ({
    '@id': semPart.id,
    measure: decodeMeasures(semPart.measures),
  }));
  
  // Merge score-parts
  const mergedScoreParts = [...originalScoreParts, ...newScoreParts];
  
  // Merge parts
  const mergedParts = [...originalParts, ...newPartObjects];
  
  // Create new document
  const newScore: ScorePartwise = {
    ...originalScore,
    'part-list': {
      ...originalPartList,
      'score-part': mergedScoreParts.length === 1 ? mergedScoreParts[0] : mergedScoreParts,
    },
    part: mergedParts.length === 1 ? mergedParts[0] : mergedParts,
  };
  
  return {
    'score-partwise': newScore,
  };
}

/**
 * Complete workflow for editing a measure range with LLM
 * 1. Extract measure range from original document
 * 2. Encode to semantic format for LLM
 * 3. Process LLM response
 * 4. Decode and replace in original document
 * 
 * @param original - Original MusicXML document
 * @param startMeasure - Starting measure number (1-based, inclusive)
 * @param endMeasure - Ending measure number (1-based, inclusive)
 * @param llmResponse - LLM response (semantic format, as object or JSON string)
 * @param partId - Optional part ID to edit only specific part
 * @returns Updated MusicXML document with replaced measures
 */
export function editMeasureRangeWithLLM(
  original: MusicXMLDocument,
  startMeasure: number,
  endMeasure: number,
  llmResponse: unknown,
  partId?: string
): MusicXMLDocument {
  // Parse and validate LLM response
  const parser = new SemanticMusicXMLParser();
  let modifiedSemantic: SemanticMusicXML;
  
  if (typeof llmResponse === 'string') {
    modifiedSemantic = parser.parseJSON(llmResponse);
  } else {
    modifiedSemantic = parser.validate(llmResponse);
  }
  
  // Get original part IDs
  const originalScore = original['score-partwise'];
  const originalPartList = originalScore['part-list'];
  const originalScoreParts = Array.isArray(originalPartList['score-part']) 
    ? originalPartList['score-part'] 
    : [originalPartList['score-part']];
  const originalPartIds = new Set(originalScoreParts.map(sp => sp['@id']));
  
  // Check if LLM added new parts
  const newPartIds = modifiedSemantic.parts
    .map(p => p.id)
    .filter(id => !originalPartIds.has(id));
  
  // If new parts were added, merge them with the original document
  if (newPartIds.length > 0) {
    console.log('Detected new parts added by LLM:', newPartIds);
    return mergePartsIntoDocument(original, modifiedSemantic);
  }
  
  // Otherwise, treat as measure range replacement
  const modifiedDocument = decodeFromSemantic(modifiedSemantic);
  return replaceMeasureRange(original, modifiedDocument, startMeasure, endMeasure, partId);
}

/**
 * Prepare a measure range for LLM editing
 * Extracts the range and encodes to semantic format
 * 
 * @param document - Full MusicXML document
 * @param startMeasure - Starting measure number (1-based, inclusive)
 * @param endMeasure - Ending measure number (1-based, inclusive)
 * @param partId - Optional part ID to edit only specific part
 * @returns Semantic MusicXML for the specified range (ready to send to LLM)
 */
export function prepareMeasureRangeForLLM(
  document: MusicXMLDocument,
  startMeasure: number,
  endMeasure: number,
  partId?: string
): SemanticMusicXML {
  const extracted = extractMeasureRange(document, startMeasure, endMeasure, partId);
  return encodeToSemantic(extracted);
}

// ============================================================================
// Semantic Encoding/Decoding (LLM-Friendly Format)
// ============================================================================

/**
 * Encode full MusicXML to compact semantic format for LLM processing
 * Removes all layout/formatting data, keeps only musical semantics
 * Results in ~70-90% size reduction
 */
export function encodeToSemantic(document: MusicXMLDocument): SemanticMusicXML {
  const score = document['score-partwise'];
  const parts = Array.isArray(score.part) ? score.part : [score.part];
  const partList = score['part-list'];
  const scoreParts = Array.isArray(partList['score-part']) 
    ? partList['score-part'] 
    : [partList['score-part']];
  
  // Extract metadata
  const title = typeof score['movement-title'] === 'string' 
    ? score['movement-title'] 
    : undefined;
  
  let composer: string | undefined;
  if (score.identification?.creator) {
    const creators = Array.isArray(score.identification.creator) 
      ? score.identification.creator 
      : [score.identification.creator];
    const composerObj = creators.find(c => 
      typeof c === 'object' && c['@type'] === 'composer'
    );
    if (composerObj && typeof composerObj === 'object') {
      composer = composerObj['#text'];
    }
  }
  
  // Encode each part
  const semanticParts: SemanticPart[] = parts.map((part, idx) => {
    const scorePart = scoreParts.find(sp => sp['@id'] === part['@id']) || scoreParts[idx];
    const midiInstruments = scorePart['midi-instrument'];
    const midiInstrument = Array.isArray(midiInstruments) 
      ? midiInstruments[0] 
      : midiInstruments;
    
    const scoreInstruments = scorePart['score-instrument'];
    const scoreInstrument = Array.isArray(scoreInstruments)
      ? scoreInstruments[0]
      : scoreInstruments;
    
    return {
      id: part['@id'],
      name: scorePart['part-name'],
      abbreviation: scorePart['part-abbreviation'],
      instrument: scoreInstrument?.['instrument-name'],
      midiProgram: midiInstrument ? Number(midiInstrument['midi-program']) : undefined,
      midiChannel: midiInstrument ? Number(midiInstrument['midi-channel']) : undefined,
      measures: encodeMeasures(part.measure),
    };
  });
  
  return {
    version: score['@version'],
    title,
    composer,
    parts: semanticParts,
  };
}

/**
 * Encode measures to semantic format
 */
function encodeMeasures(measures: Measure[]): SemanticMeasure[] {
  return measures.map(measure => {
    const semanticMeasure: SemanticMeasure = {
      number: Number(measure['@number']),
      notes: [],
    };
    
    // Extract attributes (only first one if multiple)
    const attrs = Array.isArray(measure.attributes) 
      ? measure.attributes[0] 
      : measure.attributes;
    
    if (attrs) {
      const semanticAttrs: SemanticMeasure['attributes'] = {};
      
      if (attrs.divisions) semanticAttrs.divisions = Number(attrs.divisions);
      
      if (attrs.key) {
        semanticAttrs.key = {
          fifths: Number(attrs.key.fifths),
          mode: attrs.key.mode,
        };
      }
      
      if (attrs.time) {
        semanticAttrs.time = {
          beats: Number(attrs.time.beats),
          beatType: Number(attrs.time['beat-type']),
        };
      }
      
      if (attrs.clef) {
        const clefs = Array.isArray(attrs.clef) ? attrs.clef : [attrs.clef];
        semanticAttrs.clef = clefs.map(c => ({
          sign: c.sign,
          line: Number(c.line),
          staff: c['@number'] ? Number(c['@number']) : undefined,
        }));
      }
      
      if (attrs.transpose) {
        semanticAttrs.transpose = {
          chromatic: Number(attrs.transpose.chromatic),
          diatonic: attrs.transpose.diatonic ? Number(attrs.transpose.diatonic) : undefined,
        };
      }
      
      if (Object.keys(semanticAttrs).length > 0) {
        semanticMeasure.attributes = semanticAttrs;
      }
    }
    
    // Extract directions
    const directions = measure.direction 
      ? (Array.isArray(measure.direction) ? measure.direction : [measure.direction])
      : [];
    
    const semanticDirections: SemanticMeasure['directions'] = [];
    directions.forEach(dir => {
      const dirTypes = Array.isArray(dir['direction-type']) 
        ? dir['direction-type'] 
        : [dir['direction-type']];
      
      dirTypes.forEach(dt => {
        // Tempo
        if (dt.metronome) {
          semanticDirections.push({
            type: 'tempo',
            value: Number(dt.metronome['per-minute']),
            staff: dir.staff ? Number(dir.staff) : undefined,
          });
        }
        
        // Dynamics
        if (dt.dynamics) {
          const dynamicType = Object.keys(dt.dynamics).find(k => !k.startsWith('@'));
          if (dynamicType) {
            semanticDirections.push({
              type: 'dynamics',
              value: dynamicType,
              staff: dir.staff ? Number(dir.staff) : undefined,
            });
          }
        }
        
        // Words (text directions)
        if (dt.words) {
          const words = Array.isArray(dt.words) ? dt.words : [dt.words];
          words.forEach(w => {
            const text = typeof w === 'string' ? w : w['#text'];
            if (text) {
              semanticDirections.push({
                type: 'words',
                value: text,
                staff: dir.staff ? Number(dir.staff) : undefined,
              });
            }
          });
        }
        
        // Wedge (crescendo/diminuendo)
        if (dt.wedge) {
          semanticDirections.push({
            type: 'wedge',
            value: dt.wedge['@type'],
            staff: dir.staff ? Number(dir.staff) : undefined,
          });
        }
      });
    });
    
    if (semanticDirections.length > 0) {
      semanticMeasure.directions = semanticDirections;
    }
    
    // Extract notes
    const notes = measure.note 
      ? (Array.isArray(measure.note) ? measure.note : [measure.note])
      : [];
    
    semanticMeasure.notes = notes.map(encodeNote);
    
    // Extract barline
    const barline = Array.isArray(measure.barline) 
      ? measure.barline[measure.barline.length - 1] 
      : measure.barline;
    
    if (barline) {
      semanticMeasure.barline = {
        location: barline['@location'],
        style: barline['bar-style'],
        repeat: barline.repeat?.['@direction'],
      };
    }
    
    return semanticMeasure;
  });
}

/**
 * Encode a single note to semantic format
 */
function encodeNote(note: Note): SemanticNote {
  const semantic: SemanticNote = {
    duration: Number(note.duration),
    voice: Number(note.voice),
  };
  
  // Pitch
  if (note.pitch) {
    semantic.pitch = {
      step: note.pitch.step,
      alter: note.pitch.alter ? Number(note.pitch.alter) : undefined,
      octave: Number(note.pitch.octave),
    };
  }
  
  // Basic properties
  if (note.type) semantic.type = note.type;
  if (note.staff) semantic.staff = Number(note.staff);
  if (note.chord) semantic.chord = true;
  if (note.grace) semantic.grace = true;
  if (note.accidental) semantic.accidental = note.accidental;
  
  // Dots
  if (note.dot) {
    semantic.dots = Array.isArray(note.dot) ? note.dot.length : 1;
  }
  
  // Tuplet
  if (note['time-modification']) {
    semantic.tuplet = {
      actualNotes: Number(note['time-modification']['actual-notes']),
      normalNotes: Number(note['time-modification']['normal-notes']),
    };
  }
  
  // Notations
  if (note.notations) {
    // Articulations
    if (note.notations.articulations) {
      semantic.articulations = Object.keys(note.notations.articulations)
        .filter(k => !k.startsWith('@'));
    }
    
    // Ornaments
    if (note.notations.ornaments) {
      semantic.ornaments = Object.keys(note.notations.ornaments)
        .filter(k => !k.startsWith('@'));
    }
    
    // Tied
    if (note.notations.tied) {
      const ties = Array.isArray(note.notations.tied) 
        ? note.notations.tied 
        : [note.notations.tied];
      const hasStart = ties.some(t => t['@type'] === 'start');
      const hasStop = ties.some(t => t['@type'] === 'stop');
      if (hasStart && hasStop) semantic.tie = 'continue';
      else if (hasStart) semantic.tie = 'start';
      else if (hasStop) semantic.tie = 'stop';
    }
    
    // Slur
    if (note.notations.slur) {
      const slurs = Array.isArray(note.notations.slur) 
        ? note.notations.slur 
        : [note.notations.slur];
      const slur = slurs[0];
      if (slur['@type'] === 'start') semantic.slur = 'start';
      else if (slur['@type'] === 'stop') semantic.slur = 'stop';
    }
    
    // Dynamics (from notations)
    if (note.notations.dynamics) {
      const dynamicType = Object.keys(note.notations.dynamics)
        .find(k => !k.startsWith('@'));
      if (dynamicType) semantic.dynamics = dynamicType;
    }
  }
  
  // Lyrics
  if (note.lyric) {
    const lyrics = Array.isArray(note.lyric) ? note.lyric : [note.lyric];
    const lyricTexts = lyrics.map(l => l.text).filter(Boolean);
    if (lyricTexts.length > 0) {
      semantic.lyric = lyricTexts.join(' ');
    }
  }
  
  return semantic;
}

/**
 * Decode semantic format back to full MusicXML
 * Reconstructs layout with sensible defaults
 */
export function decodeFromSemantic(semantic: SemanticMusicXML): MusicXMLDocument {
  // Build part-list
  const scoreParts: ScorePart[] = semantic.parts.map(part => {
    const scorePart: ScorePart = {
      '@id': part.id,
      'part-name': part.name,
    };
    
    if (part.abbreviation) {
      scorePart['part-abbreviation'] = part.abbreviation;
    }
    
    if (part.instrument) {
      scorePart['score-instrument'] = {
        '@id': `${part.id}-I1`,
        'instrument-name': part.instrument,
      };
    }
    
    if (part.midiProgram !== undefined || part.midiChannel !== undefined) {
      scorePart['midi-instrument'] = {
        '@id': `${part.id}-I1`,
        'midi-channel': part.midiChannel || 1,
        'midi-program': part.midiProgram || 1,
      };
    }
    
    return scorePart;
  });
  
  // Build parts
  const parts: Part[] = semantic.parts.map(semPart => ({
    '@id': semPart.id,
    measure: decodeMeasures(semPart.measures),
  }));
  
  // Build score-partwise
  const scorePartwise: ScorePartwise = {
    '@version': semantic.version || '3.1',
    'part-list': {
      'score-part': scoreParts.length === 1 ? scoreParts[0] : scoreParts,
    },
    part: parts.length === 1 ? parts[0] : parts,
  };
  
  if (semantic.title) {
    scorePartwise['movement-title'] = semantic.title;
  }
  
  if (semantic.composer) {
    scorePartwise.identification = {
      creator: {
        '@type': 'composer',
        '#text': semantic.composer,
      },
    };
  }
  
  return {
    'score-partwise': scorePartwise,
  };
}

/**
 * Decode semantic measures back to full measures
 */
function decodeMeasures(semanticMeasures: SemanticMeasure[]): Measure[] {
  return semanticMeasures.map(semMeasure => {
    const measure: Measure = {
      '@number': String(semMeasure.number),
    };
    
    // Attributes
    if (semMeasure.attributes) {
      const attrs: Attributes = {};
      
      if (semMeasure.attributes.divisions) {
        attrs.divisions = semMeasure.attributes.divisions;
      }
      
      if (semMeasure.attributes.key) {
        attrs.key = {
          fifths: semMeasure.attributes.key.fifths,
          mode: semMeasure.attributes.key.mode,
        };
      }
      
      if (semMeasure.attributes.time) {
        attrs.time = {
          beats: semMeasure.attributes.time.beats,
          'beat-type': semMeasure.attributes.time.beatType,
        };
      }
      
      if (semMeasure.attributes.clef) {
        attrs.clef = semMeasure.attributes.clef.map(c => ({
          sign: c.sign,
          line: c.line,
          '@number': c.staff ? String(c.staff) : undefined,
        }));
        if (attrs.clef.length === 1) {
          attrs.clef = attrs.clef[0];
        }
      }
      
      if (semMeasure.attributes.transpose) {
        attrs.transpose = {
          chromatic: semMeasure.attributes.transpose.chromatic,
          diatonic: semMeasure.attributes.transpose.diatonic,
        };
      }
      
      measure.attributes = attrs;
    }
    
    // Directions
    if (semMeasure.directions && semMeasure.directions.length > 0) {
      measure.direction = semMeasure.directions.map(dir => {
        const dirType: DirectionType = {};
        
        if (dir.type === 'tempo' && typeof dir.value === 'number') {
          dirType.metronome = {
            'beat-unit': 'quarter',
            'per-minute': dir.value,
          };
        } else if (dir.type === 'dynamics' && typeof dir.value === 'string') {
          dirType.dynamics = { [dir.value]: {} };
        } else if (dir.type === 'words' && typeof dir.value === 'string') {
          dirType.words = dir.value;
        } else if (dir.type === 'wedge' && typeof dir.value === 'string') {
          dirType.wedge = {
            '@type': dir.value,
          };
        }
        
        const direction: Direction = {
          'direction-type': dirType,
        };
        
        if (dir.staff) {
          direction.staff = dir.staff;
        }
        
        return direction;
      });
      
      if (measure.direction.length === 1) {
        measure.direction = measure.direction[0];
      }
    }
    
    // Notes
    if (semMeasure.notes.length > 0) {
      measure.note = semMeasure.notes.map(decodeNote);
      if (measure.note.length === 1) {
        measure.note = measure.note[0];
      }
    }
    
    // Barline
    if (semMeasure.barline) {
      const barline: Barline = {};
      if (semMeasure.barline.location) {
        barline['@location'] = semMeasure.barline.location;
      }
      if (semMeasure.barline.style) {
        barline['bar-style'] = semMeasure.barline.style;
      }
      if (semMeasure.barline.repeat) {
        barline.repeat = { '@direction': semMeasure.barline.repeat };
      }
      measure.barline = barline;
    }
    
    return measure;
  });
}

/**
 * Decode a semantic note back to full note
 */
function decodeNote(semantic: SemanticNote): Note {
  const note: Note = {
    duration: semantic.duration,
    voice: semantic.voice,
  };
  
  // Pitch or rest
  if (semantic.pitch) {
    note.pitch = {
      step: semantic.pitch.step,
      octave: semantic.pitch.octave,
    };
    if (semantic.pitch.alter !== undefined) {
      note.pitch.alter = semantic.pitch.alter;
    }
  } else {
    note.rest = {};
  }
  
  // Basic properties
  if (semantic.type) note.type = semantic.type;
  if (semantic.staff) note.staff = semantic.staff;
  if (semantic.chord) note.chord = {};
  if (semantic.grace) note.grace = {};
  if (semantic.accidental) note.accidental = semantic.accidental;
  
  // Dots
  if (semantic.dots) {
    note.dot = semantic.dots === 1 ? {} : Array(semantic.dots).fill({});
  }
  
  // Tuplet
  if (semantic.tuplet) {
    note['time-modification'] = {
      'actual-notes': semantic.tuplet.actualNotes,
      'normal-notes': semantic.tuplet.normalNotes,
    };
  }
  
  // Notations
  const notations: Notations = {};
  let hasNotations = false;
  
  if (semantic.articulations && semantic.articulations.length > 0) {
    notations.articulations = {};
    semantic.articulations.forEach(art => {
      notations.articulations![art] = {};
    });
    hasNotations = true;
  }
  
  if (semantic.ornaments && semantic.ornaments.length > 0) {
    notations.ornaments = {};
    semantic.ornaments.forEach(orn => {
      notations.ornaments![orn] = {};
    });
    hasNotations = true;
  }
  
  if (semantic.tie) {
    if (semantic.tie === 'continue') {
      notations.tied = [
        { '@type': 'stop' },
        { '@type': 'start' },
      ];
    } else {
      notations.tied = { '@type': semantic.tie };
    }
    hasNotations = true;
  }
  
  if (semantic.slur) {
    notations.slur = { '@type': semantic.slur, '@number': '1' };
    hasNotations = true;
  }
  
  if (semantic.dynamics) {
    notations.dynamics = { [semantic.dynamics]: {} };
    hasNotations = true;
  }
  
  if (hasNotations) {
    note.notations = notations;
  }
  
  // Lyrics
  if (semantic.lyric) {
    note.lyric = {
      '@number': '1',
      text: semantic.lyric,
    };
  }
  
  return note;
}

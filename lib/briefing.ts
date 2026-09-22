/**
 * The operation briefing. This is challenge content — the story, the mission
 * and the intelligence a team needs to work out what to attack — so it lives
 * here on the server and is only ever sent to the browser once the contest is
 * running. Putting it in a client component would ship it in the page source,
 * where anyone could read it before the start.
 */

export interface BriefingPanel {
  /** Reference designator, printed on the panel like a part on a board. */
  designator: string;
  heading: string;
  paragraphs: string[];
  list?: { label: string; items: string[] };
}

export interface Briefing {
  operation: string;
  panels: BriefingPanel[];
}

export const BRIEFING: Briefing = {
  operation: "Air-gap server room infiltration",
  panels: [
    {
      designator: "A",
      heading: "The story",
      paragraphs: [
        "You have been contracted to breach a physically isolated server room. Every attack over the network has failed, because the system is completely air-gapped. You have until the security shift changes — the clock at the top of the page is the real one.",
        "Your target is a lazy systems administrator who reuses credentials and leaves equipment lying around. He dropped his company-issued wireless earphones in the lobby, and left his physical access card on a desk.",
      ],
    },
    {
      designator: "B",
      heading: "The mission",
      paragraphs: [
        "Get into the server room using the administrator's username and his physical access card. Then compromise the system by recovering the authentication key the master uses to reach the slaves.",
      ],
      list: {
        label: "Hardware kit, per team",
        items: [
          "1× RC522 RFID reader",
          "1× ESP32 microcontroller",
          "Breadboard and jumper wires",
        ],
      },
    },
    {
      designator: "C",
      heading: "Intelligence",
      paragraphs: [
        "The company issues the same username across every product an employee receives. Whatever you find on one device is worth trying on another.",
        "Every 10 minutes the organisers release a technical hint, or hand one out directly to teams stuck on a protocol.",
      ],
    },
  ],
};

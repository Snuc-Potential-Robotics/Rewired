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
        "Three days ago, an isolated research facility developing a prototype secure autonomous communication system went completely offline, leaving behind only one automated message: **“The system is still alive.”** No network connection can be detected, yet two unidentified electronic devices inside the secured room remain powered and periodically communicate with each other. A note left by the researchers reads, **“Nothing important is stored in one place. The air remembers who you are. The old key remembers how to enter. And the wires remember everything.”** As you investigate, you discover that one device is repeatedly broadcasting a strange sequence of hexadecimal characters, suggesting that its identity may be hidden in the signal itself. Nearby, an old access card carries another cryptic message: **“The key does not speak until you ask it the right way,”** hinting that the physical key must be understood before it can grant access. Inside the room, DEVICE A and DEVICE B continue exchanging data every ten seconds through a small number of electrical connections, with a final note marked **“MASTER → SLAVE”** warning, **“If you can hear the conversation, you can recover what they are hiding.”** Your mission is to reconstruct the three-layer security system, follow each discovery to the next, and recover the **FINAL KEY** without damaging the equipment, disconnecting the communicating devices, or altering their behavior. **Three layers. Three clues. One key. The clock is already running.**",
      ],
    },
  ],
};

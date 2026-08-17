import type { MemoryItem } from "@memorium/core";
import { contentHash, generateId, nowIso } from "@memorium/core";

/** Sample memories for POC demos — fictional content inspired by real archive shapes */
export function createDemoItems(memorialId: string): MemoryItem[] {
  const importedAt = nowIso();

  const samples: Array<Omit<MemoryItem, "id" | "memorialId" | "importedAt" | "contentHash">> = [
    {
      type: "post",
      source: "meta_facebook",
      title: "Sunday dinner tradition",
      text: "Nothing beats Rose's arroz con pollo. Every Sunday the whole block could smell it cooking. She always made enough for whoever showed up — and someone always showed up.",
      occurredAt: "2018-03-11T18:30:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { reactions: 47, comments: 12 },
    },
    {
      type: "post",
      source: "meta_instagram",
      title: "Garden in bloom",
      text: "Her roses are finally opening 🌹 Third year in a row she's won the neighborhood garden club ribbon. #roses #garden #spring",
      occurredAt: "2019-05-04T14:22:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { likes: 89 },
    },
    {
      type: "message",
      source: "meta_messenger",
      title: "Message from Maria",
      text: "Tía Rose — can you send me the recipe for the flan? The one you made for abuela's birthday. I want to make it for Sofia's quinceañera.",
      occurredAt: "2020-02-14T21:05:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { sender: "Maria" },
    },
    {
      type: "message",
      source: "meta_messenger",
      title: "Message from Rose",
      text: "Of course mija! I'll write it out by hand and mail it to you. Some things shouldn't live only on a phone. Love you 💕",
      occurredAt: "2020-02-14T21:18:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { sender: "Rose Martinez" },
    },
    {
      type: "email",
      source: "email",
      title: "Re: College move-in day",
      text: "Dear James,\n\nI packed the quilt your grandfather made — the blue one. Take care of it. Call me when you get there, even if it's late. I'll be awake.\n\nLove always,\nMom",
      occurredAt: "2017-08-22T09:15:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { from: "rose.martinez@gmail.com", to: "james.martinez@university.edu" },
    },
    {
      type: "email",
      source: "email",
      title: "Photos from the reunion",
      text: "Hi everyone,\n\nAttached are the photos from last weekend. What a wonderful time seeing all of you. Let's not wait another five years!\n\nRose",
      occurredAt: "2015-07-03T16:40:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { from: "rose.martinez@gmail.com", to: "family@martinez-clan.com" },
    },
    {
      type: "message",
      source: "whatsapp",
      title: "WhatsApp from James",
      text: "Mom, landed safe. Room is small but the quilt is on the bed already. Miss you.",
      occurredAt: "2017-08-22T22:30:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { sender: "James", chat: "Family Group" },
    },
    {
      type: "message",
      source: "whatsapp",
      title: "WhatsApp from Rose",
      text: "So proud of you. Eat something besides ramen. I left money in the envelope — don't argue with me.",
      occurredAt: "2017-08-22T22:45:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { sender: "Rose Martinez", chat: "Family Group" },
    },
    {
      type: "post",
      source: "meta_facebook",
      title: "Happy birthday Sofia!",
      text: "15 years ago I became a great-aunt and the world got a little brighter. Feliz quinceañera princesa! The flan recipe lives on. 🎂",
      occurredAt: "2021-06-12T19:00:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { reactions: 112 },
    },
    {
      type: "note",
      source: "manual",
      title: "Voice note transcript",
      text: "Recorded at the kitchen table, March 2022: 'Tell them about the time your father and I drove to Niagara Falls with no map. We got lost three times and it was the best trip we ever took. Getting lost together is underrated.'",
      occurredAt: "2022-03-08T15:00:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { recordedBy: "Maria" },
    },
    {
      type: "photo",
      source: "manual",
      title: "Wedding day, 1978",
      text: "Scanned from the album in the hall closet. Rose and Antonio outside St. Mary's. She said yes before he finished the question.",
      occurredAt: "1978-09-16T16:00:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { scannedBy: "James", originalFormat: "polaroid" },
    },
    {
      type: "message",
      source: "sms",
      title: "Text from Rose",
      text: "Don't forget your coat. It's colder than the forecast says. Love you.",
      occurredAt: "2019-12-01T07:12:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { sender: "Rose Martinez" },
    },
    {
      type: "post",
      source: "meta_instagram",
      title: "Christmas cookies",
      text: "Annual cookie marathon with the grandkids. Flour everywhere. Wouldn't have it any other way. 🍪",
      occurredAt: "2019-12-22T11:30:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { likes: 134 },
    },
    {
      type: "email",
      source: "email",
      title: "Recipe card scan",
      text: "Maria — here is the flan recipe, written exactly as my mother gave it to me in 1962. The secret is the water bath and patience. Never rush a flan.\n\nCon cariño,\nRose",
      occurredAt: "2020-02-20T10:00:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { from: "rose.martinez@gmail.com", to: "maria.m@gmail.com" },
    },
    {
      type: "post",
      source: "meta_facebook",
      title: "Neighborhood block party",
      text: "Thank you to everyone who came out today. Rose's famous empanadas disappeared in twenty minutes — I'll take that as a compliment. Already planning next year.",
      occurredAt: "2016-08-17T20:00:00.000Z",
      personIds: [],
      mediaRefs: [],
      metadata: { reactions: 63 },
    },
  ];

  return samples.map((sample) => {
    const text = sample.text;
    const occurredAt = sample.occurredAt;
    return {
      ...sample,
      id: generateId(),
      memorialId,
      importedAt,
      contentHash: contentHash([sample.source, sample.type, occurredAt, sample.title ?? "", text]),
    };
  });
}

export function demoSubjectName(): string {
  return "Rose Martinez";
}

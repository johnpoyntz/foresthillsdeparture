"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

type Prediction = {
  id: string;
  attributes: {
    departure_time: string | null;
    arrival_time: string | null;
    direction_id: number | null;
  };
  relationships?: {
    trip?: {
      data?: {
        id: string;
      } | null;
    };
  };
};

type MbtaRoute = {
  type: string;
  id: string;
  attributes?: {
    direction_destinations?: string[];
  };
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function fmtTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const GREEN_MESSAGES = [
  "Wicked clean timing 😎✅🚇",
  "Pahfect window, kehd 🟢🔥🙌",
  "You lined this up nasty good 😮‍💨🎯🚉",
  "Go now and flex on the T 💪🚇✨",
  "This one is gift-wrapped 🎁🟢😤",
  "Clock says yes, legs say go ⏰✅🏃",
  "Smooth launch, no chaos 😌🚀🚇",
  "You are in the sweet spot 🍬🟢👌",
  "Easy catch energy 😏🚉✅",
  "Forest Hills run starts now 🌳🏁🚶",
  "You are absolutely cookin 🍳🔥🟢",
  "Big W timing, kehd 🏆🚇😤",
  "No panic, all motion 😌➡️🚉",
  "You got this one in the bag 🎒✅🚇",
  "Green glow, go mode 🟢✨🏃",
  "Clean break from the house 🚪💨🚇",
  "Timing is chef's kiss 👨‍🍳💋🟢",
  "You are wicked on point 🎯🔥✅",
  "This train is yours, kehd 👑🚇😎",
  "Elite commuter form right now 🧠💪🚉",
];

const YELLOW_MESSAGES = [
  "Hurry up, kehd 😬🟡🏃",
  "Move move move 🟡💨🚇",
  "You still got a shot 😤🎯🟡",
  "Clock is screaming rn ⏰😵‍💫🟡",
  "Fast feet, no side quests 👟⚡🧭",
  "This is crunch time 🍋🟡🔥",
  "Go now before it flips red 🟡➡️🔴",
  "Quick pace or pain 😅🏃🚉",
  "Tight window, kehd 😬🚪⏳",
  "No scrolling, just strolling fast 📵🚶‍♂️💨",
  "You can still steal this one 🥷🚇🟡",
  "Hustle mode: on 🟡⚙️🔥",
  "This is your warning lap 🟡📣🏁",
  "Time to hoof it, kehd 🐎💨🟡",
  "Leave now, breathe later 😮‍💨➡️🚉",
  "You are one delay from doom 😵‍💫🟡⏱️",
  "Out the doah, now 🚪🏃🟡",
  "Don't think, just move 🧠❌💨",
  "Platform still possible... barely 😬🚉🟡",
  "Chop chop, kehd ✂️⏰🟡",
];

const RED_MESSAGES = [
  "Yeah... not this one, kehd 🔴😮‍💨🚇",
  "Window closed, vibes intact 🔴🚪🫡",
  "That train said nope 🔴🙅‍♂️🚉",
  "Hold up and reset 🧘🔴⏱️",
  "No board this round 🎟️❌🔴",
  "Too late or too early, either way nah 🔴🤷‍♂️⏳",
  "Current mode: wait, kehd 🔴🪑😅",
  "That one left the chat 🔴👋💬",
  "Pause here, next chance soon 🔴⏸️🚇",
  "Stand by for next move 🔴📡🛤️",
  "Not go-time yet 🔴🕰️🙃",
  "Take a breath, re-time it 🔴😮‍💨🔁",
  "Sweet spot missed for now 🔴🍩📉",
  "No sprint needed, just wait 🔴🏃❌",
  "Reset arc begins now 🔴🎬😤",
  "This round is chalked 🔴🧯😬",
  "Train gone, pride remains 🔴🚇💔",
  "You got MBTA'd a lil 🔴😵‍💫🚉",
  "Next opportunity loading... 🔴⌛🚦",
  "Kehd, we regroup and go next 🔴🤝🚇",
];

function formatCountdown(ms: number) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function Page() {
  const WALK_MIN = 6;
  const GREEN_MIN_MS = 60_000;
  const GREEN_MAX_MS = 120_000;
  const YELLOW_MIN_MS = 0;
  const YELLOW_MAX_MS = 60_000;

  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [oakGroveDirectionId, setOakGroveDirectionId] = useState<number | null>(null);
  const [feedState, setFeedState] = useState<"connecting" | "connected" | "disconnected">(
    "connecting",
  );
  const [lastConnectedAt, setLastConnectedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const prevLightRef = useRef<"red" | "yellow" | "green" | null>(null);

  const pollRef = useRef<number | null>(null);

  async function load() {
    try {
      const qs = new URLSearchParams();
      qs.set("stop", "place-forhl");
      qs.set("route", "Orange");

      const response = await fetch(`/api/mbta/predictions?${qs.toString()}`);
      const raw = await response.text();

      if (!response.ok) {
        setPredictions([]);
        setFeedState("disconnected");
        return;
      }

      const json = JSON.parse(raw) as { data?: Prediction[]; included?: MbtaRoute[] };
      const data: Prediction[] = (json.data ?? []).filter(Boolean);

      const route = (json.included ?? []).find((item) => item.type === "route" && item.id === "Orange");
      const directionNames = route?.attributes?.direction_destinations ?? [];
      const directionIdx = directionNames.findIndex((name) => name.toLowerCase().includes("oak grove"));

      setOakGroveDirectionId(directionIdx >= 0 ? directionIdx : null);
      setPredictions(data);
      setFeedState("connected");
      setLastConnectedAt(Date.now());
    } catch {
      setPredictions([]);
      setFeedState("disconnected");
    }
  }

  useEffect(() => {
    const initialRef = window.setTimeout(() => {
      void load();
    }, 0);
    pollRef.current = window.setInterval(() => {
      void load();
    }, 15_000);

    return () => {
      window.clearTimeout(initialRef);
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(clock);
  }, []);

  const nextDeparture = useMemo(() => {
    const upcoming = predictions
      .map((prediction) => ({
        when: prediction.attributes.departure_time ?? prediction.attributes.arrival_time,
        directionId: prediction.attributes.direction_id,
        tripId: prediction.relationships?.trip?.data?.id ?? null,
      }))
      .filter((item): item is { when: string; directionId: number | null; tripId: string | null } => !!item.when)
      .filter((item) => (oakGroveDirectionId === null ? true : item.directionId === oakGroveDirectionId))
      .map((item) => ({
        ...item,
        at: new Date(item.when),
      }))
      .filter((item) => item.at.getTime() > now)
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    const seenTrips = new Set<string>();
    const minTravelMs = WALK_MIN * 60_000;
    for (const item of upcoming) {
      if (item.tripId) {
        if (seenTrips.has(item.tripId)) {
          continue;
        }
        seenTrips.add(item.tripId);
      }

      // If you cannot physically make this train with the fixed walk time, skip it.
      if (item.at.getTime() - now < minTravelMs) {
        continue;
      }

      return item.at;
    }

    return null;
  }, [predictions, oakGroveDirectionId, now, WALK_MIN]);

  const msUntilLeave = useMemo(() => {
    if (!nextDeparture) {
      return null;
    }
    return nextDeparture.getTime() - now - WALK_MIN * 60_000;
  }, [nextDeparture, now]);

  const light: "red" | "yellow" | "green" = useMemo(() => {
    if (msUntilLeave === null) {
      return "red";
    }

    if (msUntilLeave >= GREEN_MIN_MS && msUntilLeave <= GREEN_MAX_MS) {
      return "green";
    }

    if (msUntilLeave >= YELLOW_MIN_MS && msUntilLeave < YELLOW_MAX_MS) {
      return "yellow";
    }

    return "red";
  }, [msUntilLeave, GREEN_MIN_MS, GREEN_MAX_MS, YELLOW_MIN_MS, YELLOW_MAX_MS]);

  const messagesForLight = useMemo(() => {
    if (light === "green") {
      return GREEN_MESSAGES;
    }
    if (light === "yellow") {
      return YELLOW_MESSAGES;
    }
    return RED_MESSAGES;
  }, [light]);

  const feedText = useMemo(() => {
    if (feedState === "connected" && lastConnectedAt) {
      const ageSeconds = Math.max(0, Math.floor((now - lastConnectedAt) / 1000));
      return `Live MBTA • ${ageSeconds}s ago`;
    }
    if (feedState === "disconnected") {
      return "Live MBTA disconnected";
    }
    return "Live MBTA connecting...";
  }, [feedState, lastConnectedAt, now]);

  useEffect(() => {
    setMessageIndex(Math.floor(Math.random() * messagesForLight.length));
  }, [messagesForLight]);

  const lightMessage = messagesForLight[messageIndex] ?? "";
  const leaveInText = useMemo(() => {
    if (msUntilLeave === null) {
      return "--:--";
    }
    if (msUntilLeave >= 0) {
      return formatCountdown(msUntilLeave);
    }
    return `-${formatCountdown(Math.abs(msUntilLeave))}`;
  }, [msUntilLeave]);
  const leaveInColorClass =
    light === "green"
      ? styles.leaveGreen
      : light === "yellow"
        ? styles.leaveYellow
        : styles.leaveRed;

  useEffect(() => {
    if (!("Notification" in window)) {
      return;
    }
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    const prev = prevLightRef.current;
    const changed = prev !== null && prev !== light;
    const shouldNotify = changed && (light === "yellow" || light === "green");
    if (
      shouldNotify &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      nextDeparture
    ) {
      const lead = msUntilLeave === null ? "" : `Leave in ${leaveInText}. `;
      new Notification(
        light === "green" ? "Good to leave" : "Hurry up",
        { body: `${lead}Next departs at ${fmtTime(nextDeparture)}.` },
      );
    }
    prevLightRef.current = light;
  }, [light, nextDeparture, msUntilLeave, leaveInText]);

  useEffect(() => {
    if (!nextDeparture) {
      document.title = "No train yet • Forest Hills Departure";
      return;
    }
    document.title = `${leaveInText} to leave • ${fmtTime(nextDeparture)} dep`;
  }, [leaveInText, nextDeparture]);

  async function onInstallClick() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.signPanel}>
        <Image
          src="/forest-hills-sign.svg"
          alt="Forest Hills station sign"
          width={980}
          height={280}
          className={styles.signBg}
          priority
        />

        <div className={styles.overlay}>
          <div className={styles.infoBar}>
            <div className={styles.timeBlock}>
              <div className={styles.departureLabel}>leave in</div>
              <div className={styles.departureRow}>
                <div className={styles.leaveTimer}>
                  <strong className={`${styles.leaveTimerValue} ${leaveInColorClass}`}>
                    {leaveInText}
                  </strong>
                </div>
                <div className={styles.nextDepartureMini}>
                  <span>next departure</span>
                  <strong>{nextDeparture ? fmtTime(nextDeparture) : "--:--"}</strong>
                </div>
              </div>
              <div
                className={`${styles.feedStatus} ${
                  feedState === "connected"
                    ? styles.statusConnected
                    : feedState === "disconnected"
                      ? styles.statusDisconnected
                      : styles.statusConnecting
                }`}
              >
                {feedText}
                {installPrompt && (
                  <button className={styles.installBtn} onClick={onInstallClick}>
                    Install app
                  </button>
                )}
              </div>
            </div>
            <div className={styles.lightColumn}>
              <div className={styles.lightStack}>
                <span className={`${styles.light} ${styles.green} ${light === "green" ? styles.active : ""}`} />
                <span className={`${styles.light} ${styles.yellow} ${light === "yellow" ? styles.active : ""}`} />
                <span className={`${styles.light} ${styles.red} ${light === "red" ? styles.active : ""}`} />
              </div>
              <div className={styles.lightMessage}>{lightMessage}</div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

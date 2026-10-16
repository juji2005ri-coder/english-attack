"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { stages, Stage } from "@/data/questions";

type Screen = "home" | "select" | "playing" | "over" | "clear";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [stage, setStage] = useState<Stage | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeoutQuestion, setTimeoutQuestion] = useState<Stage["questions"][number] | null>(null);
  const deadlineRef = useRef(0);
  const transitioningRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startStage = useCallback((selected: Stage) => {
    const shuffledQuestions = [...selected.questions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    setStage({ ...selected, questions: shuffledQuestions });
    setQuestionIndex(0);
    setSeconds(selected.timeLimit);
    setAnswer("");
    setFeedback(null);
    setTimeoutQuestion(null);
    transitioningRef.current = false;
    deadlineRef.current = performance.now() + selected.timeLimit * 1000;
    setScreen("playing");
  }, []);

  useEffect(() => {
    if (screen !== "playing" || !stage) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, deadlineRef.current - performance.now());
      const nextSeconds = Math.ceil(remaining / 1000);
      setSeconds(nextSeconds);
      if (remaining <= 0 && !transitioningRef.current) {
        transitioningRef.current = true;
        setTimeoutQuestion(stage.questions[questionIndex]);
        setScreen("over");
      }
    }, 50);
    inputRef.current?.focus();
    return () => window.clearInterval(timer);
  }, [screen, stage, questionIndex]);

  const submitAnswer = (event?: FormEvent) => {
    event?.preventDefault();
    if (!stage || screen !== "playing" || transitioningRef.current) return;
    const current = stage.questions[questionIndex];
    const normalized = answer.trim().toLowerCase();
    if (!current.acceptedAnswers.some((item) => item.toLowerCase() === normalized)) {
      setAnswer("");
      setFeedback("wrong");
      window.setTimeout(() => setFeedback(null), 700);
      return;
    }
    transitioningRef.current = true;
    setFeedback("correct");
    window.setTimeout(() => {
      if (questionIndex === stage.questions.length - 1) {
        setScreen("clear");
        return;
      }
      const nextIndex = questionIndex + 1;
      setQuestionIndex(nextIndex);
      setSeconds(stage.timeLimit);
      setAnswer("");
      setFeedback(null);
      transitioningRef.current = false;
      deadlineRef.current = performance.now() + stage.timeLimit * 1000;
    }, 380);
  };

  const goSelect = () => {
    setScreen("select");
    setStage(null);
    setFeedback(null);
    setTimeoutQuestion(null);
  };

  if (screen === "home") {
    return <main className="shell home-screen"><div className="sunburst" /><div className="brand"><span>ENGLISH</span><strong>ATTACK</strong></div><p className="tagline">意味をつかめ。英単語を撃ち抜け。</p><button className="arcade-button primary" onClick={() => setScreen("select")}>PLAY GAME <span>▶</span></button><p className="hint">日本語と韓国語のヒントから答えを入力しよう</p></main>;
  }

  if (screen === "select") {
    return <main className="shell select-screen"><Header onHome={() => setScreen("home")} /><section className="select-content"><p className="eyebrow">SELECT YOUR MISSION</p><h1>ステージを選ぼう</h1><div className="stage-grid">{stages.map((item) => <button className="stage-card" key={item.id} onClick={() => startStage(item)}><div className="stage-number">0{item.id}</div><div><h2>{item.name}</h2><p>{item.label}</p><small>{item.timeLimit}秒 / {item.questions.length}問</small></div><span className="card-arrow">→</span></button>)}</div></section></main>;
  }

  if (!stage) return null;
  const current = stage.questions[questionIndex];
  const isWarning = seconds <= 5;
  const wordHint = `${current.word[0].toUpperCase()} ${"_ ".repeat(Math.max(0, current.word.length - 1)).trim()}`;
  if (screen === "playing") {
    return <main className={`shell game-screen ${isWarning ? "warning" : ""} ${feedback === "correct" ? "success" : ""}`}><div className="track track-back" /><div className="track track-front" /><Header onHome={goSelect} /><section className="game-content"><div className="game-meta"><span>STAGE {stage.id} / {stage.name}</span><span>QUESTION <b>{String(questionIndex + 1).padStart(2, "0")}</b> / {stage.questions.length}</span></div><div className="timer-wrap"><span>TIME</span><strong>{String(seconds).padStart(2, "0")}</strong><div className="timer-bar"><i style={{ width: `${(seconds / stage.timeLimit) * 100}%` }} /></div></div><div className="question-card"><div className="hint-label">HINT / {current.partOfSpeech} · {current.partOfSpeechKo}</div><p className="definition ja">{current.definitionJa}</p><div className="divider" /><p className="definition ko">{current.definitionKo}</p><div className="letter-hint" aria-label="頭文字ヒント"><span>💡 {wordHint}</span><small>{current.word.length} letters</small></div></div><form className="answer-form" onSubmit={submitAnswer}><label htmlFor="answer">YOUR ANSWER</label><div className="input-row"><input ref={inputRef} id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" spellCheck={false} placeholder="英単語を入力..." /><button className="arcade-button submit" type="submit">FIRE <span>↗</span></button></div><p className="enter-hint">ENTERキーでも回答できます</p></form>{feedback === "wrong" && <div className="feedback wrong">NOT YET — もう一度！</div>}{feedback === "correct" && <div className="feedback correct">GREAT SHOT!</div>}</section></main>;
  }

  const clear = screen === "clear";
  return <main className={`shell result-screen ${clear ? "clear" : "over"}`}><div className="result-burst" /><p className="eyebrow">{clear ? "MISSION COMPLETE" : "TIME OUT"}</p><h1>{clear ? "STAGE CLEAR!" : "GAME OVER"}</h1><p className="result-copy">{clear ? "すべての単語を撃ち抜いた！" : "時間切れ。もう一度挑戦しよう。"}</p>{!clear && timeoutQuestion && <section className="answer-reveal"><p className="reveal-label">THE ANSWER WAS</p><strong>{timeoutQuestion.word}</strong><p><b>品詞：</b>{timeoutQuestion.partOfSpeech} · {timeoutQuestion.partOfSpeechKo}</p><p><b>日本語：</b>{timeoutQuestion.definitionJa}</p><p><b>한국어：</b>{timeoutQuestion.definitionKo}</p></section>}<div className="result-score">{clear ? `${stage.questions.length} / ${stage.questions.length}` : `${questionIndex} / ${stage.questions.length}`}<span> QUESTIONS</span></div><div className="result-actions"><button className="arcade-button primary" onClick={() => startStage(stage)}>{clear ? "PLAY AGAIN" : "RETRY"} <span>↻</span></button>{clear && stage.id < stages.length && <button className="arcade-button secondary" onClick={() => startStage(stages[stage.id])}>NEXT STAGE <span>→</span></button>}<button className="text-button" onClick={goSelect}>ステージ選択に戻る</button></div></main>;
}

function Header({ onHome }: { onHome: () => void }) {
  return <header className="topbar"><button className="mini-logo" onClick={onHome}><span>E</span>A</button><div className="top-title">ENGLISH <b>ATTACK</b></div><button className="back-button" onClick={onHome}>← MENU</button></header>;
}

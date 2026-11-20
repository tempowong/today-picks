export function LoadingBoard() {
  return (
    <main aria-busy="true">
      <header className="mast">
        <h1 className="loading-title">今日心水</h1>
        <p className="kicker kicker-mobile">示範賽程 · 香港時間</p>
        <p className="kicker kicker-desktop">示範賽程 · 香港時間</p>
      </header>
      <p className="sr-only">載入中</p>
      <div className="card-list">
        {[0, 1, 2].map((index) => (
          <div className="match-card" key={index} aria-hidden="true">
            <div className="sk-bars">
              <div className="sk-bar" style={{ width: "30%", height: 16 }} />
              <div className="sk-bar" style={{ width: "70%", height: 20 }} />
              <div className="sk-bar" style={{ width: "85%", height: 22 }} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function ErrorBoard(props: { onRetry: () => void }) {
  return (
    <main>
      <header className="mast">
        <h1>今日心水</h1>
        <p className="kicker kicker-mobile">示範賽程 · 香港時間</p>
        <p className="kicker kicker-desktop">示範賽程 · 香港時間</p>
      </header>
      <div className="state-block">
        <div className="stamp-spacer" aria-hidden="true" />
        <div>
          <p className="empty-hero">無法讀取公開彩池</p>
          <button type="button" className="retry" onClick={props.onRetry}>
            重試
          </button>
        </div>
      </div>
    </main>
  );
}

export function EmptyState() {
  return (
    <div className="state-block">
      <div className="stamp-spacer" aria-hidden="true" />
      <p className="empty-hero">今日未有已核對場次</p>
    </div>
  );
}

export function StaleLine(props: { verifiedAtHkt: string; withTime?: boolean }) {
  return (
    <p className="stale-line">
      已過慣常更新，仍顯示上次已核對內容
      {props.withTime ? ` · 核對時間 ${props.verifiedAtHkt}（香港時間）` : ""}
    </p>
  );
}

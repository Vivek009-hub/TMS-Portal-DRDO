export default function SplashScreen({ fadingOut }) {
  return (
    <div className={`splash-screen ${fadingOut ? 'splash-fade-out' : ''}`}>
      <img className="splash-logo" src="/drdo-logo2.png" alt="DRDO Logo" />
      <h1 className="splash-title">Training Management Portal</h1>
      <p className="splash-subtitle">Ministry of Defence &middot; Government of India</p>
      <div className="splash-loader"><span /></div>
    </div>
  );
}

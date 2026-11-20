import Link from "next/link";
import { Phone, Menu, Wallet } from "lucide-react";

const branches = [
  { name: "Mokattam Branch", arabic: "فرع المقطم", phone: "01070845123", href: "tel:+201070845123" },
  { name: "Maadi Branch", arabic: "فرع المعادي", phone: "01005607986", href: "tel:+201005607986" },
];

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-header">
        <Link className="landing-brand" href="/">BISTRO HOUSE</Link>
        <Link className="landing-menu-link" href="/menu"><Menu size={17} /> Menu</Link>
      </header>

      <section className="landing-hero">
        <span className="landing-kicker">WELCOME TO</span>
        <h1>Bistro House</h1>
        <p>Good food. Great moments.</p>
        <Link className="landing-menu-button" href="/menu">Explore Menu <Menu size={18} /></Link>
      </section>

      <section className="landing-content">
        <div className="landing-section-title">
          <span>CONTACT US</span>
          <h2>Our Branches</h2>
        </div>
        <div className="landing-branches">
          {branches.map((branch) => (
            <article className="landing-branch" key={branch.phone}>
              <h3>{branch.name}</h3>
              <p>{branch.arabic}</p>
              <a className="landing-phone" href={branch.href}><Phone size={17} /> {branch.phone}</a>
              <a className="landing-branch-button" href={branch.href}>Call Branch</a>
            </article>
          ))}
        </div>
        <div className="landing-payment">
          <Wallet size={22} />
          <div><h3>InstaPay</h3><p>Pay securely through InstaPay</p></div>
          <button type="button" disabled aria-label="InstaPay link will be added later">InstaPay</button>
        </div>
      </section>
      <footer className="landing-footer">© {new Date().getFullYear()} Bistro House</footer>
    </main>
  );
}

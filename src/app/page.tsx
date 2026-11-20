import Link from "next/link";
import { Phone, Wallet } from "lucide-react";

const branches = [
  { name: "Mokattam Branch", arabic: "فرع المقطم", phone: "01070845123", href: "tel:+201070845123" },
  { name: "Maadi Branch", arabic: "فرع المعادي", phone: "01005607986", href: "tel:+201005607986" },
];

export default function Home() {
  return (
    <main className="landing-page">
      <section className="landing-main">
        <span className="landing-kicker">WELCOME TO</span>
        <h1>Bistro House</h1>
        <nav className="landing-actions" aria-label="Main links">
          <Link className="landing-action landing-action-primary" href="/menu">Menu</Link>
          <a className="landing-action" href="#contact">Contact</a>
          <button className="landing-action landing-action-disabled" type="button" disabled>
            <Wallet size={17} /> InstaPay
          </button>
        </nav>
      </section>

      <section id="contact" className="landing-contact">
        <h2>Contact our branches</h2>
        <div className="landing-branches">
          {branches.map((branch) => (
            <article className="landing-branch" key={branch.phone}>
              <div>
                <h3>{branch.name}</h3>
                <p>{branch.arabic}</p>
              </div>
              <a href={branch.href} aria-label={`Call ${branch.name}`}>
                <Phone size={16} /> {branch.phone}
              </a>
            </article>
          ))}
        </div>
      </section>
      <footer className="landing-footer">© {new Date().getFullYear()} Bistro House</footer>
    </main>
  );
}

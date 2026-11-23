import { landingMarkup } from "./reference-markup";
import { LandingInteractions } from "./landing-interactions";
import { PublicHeader } from "./public-header";
import "./reference-landing.css";

// The static reference stays on the server; only interaction code ships as JS.
const pageMarkup = landingMarkup.replace(/<header>[\s\S]*?<\/header>/, "");
export function ReferenceLanding() {
  return <div id="spark-landing-root">
    <PublicHeader />
    <div dangerouslySetInnerHTML={{ __html: pageMarkup }} />
    <LandingInteractions />
  </div>;
}

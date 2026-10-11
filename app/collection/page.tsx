import { ArrowUpRight } from "lucide-react";
import { CORPUS } from "../../lib/corpus";
import { STUDIO_ART } from "../../lib/studio-art";
import { ArtworkImage } from "../../components/artwork-view";
import { Footer, Header, MeaningBadge } from "../../components/loom-ui";

export default function Collection() {
  return <><Header/><main className="collection-page page-width">
    <div className="eyebrow">27 SMALL PHRASES. A WHOLE WORLD.</div>
    <h1>The prepared<br/><em>collection.</em></h1>
    <p className="collection-intro">Every phrase has its own illustration, imagined myth, story, and four-line lyric. Choose one to make a take-home thread and bring something to the living kopitiam. No live generation needed.</p>
    <div className="collection-summary"><span>27 original illustrations</span><span>Meaning and imagination, clearly labelled</span><span>Ready for the room</span></div>
    <div className="collection-grid">{CORPUS.map((entry, index) => {
      const art = STUDIO_ART[entry.term];
      return <article className="collection-item" key={entry.term}>
        <a className="collection-image" href={`/?term=${encodeURIComponent(entry.term)}`} aria-label={`Choose ${entry.term}`}>
          {art ? <ArtworkImage url={art.url} alt={art.alt}/> : <div className="sample-art-pending">{entry.term}</div>}
        </a>
        <div className="collection-caption"><span className="collection-number">{String(index + 1).padStart(2, "0")} / 27</span><h2>{entry.term}</h2><MeaningBadge verified={entry.verified}/><p>{entry.meaning}</p><a className="text-link" href={`/?term=${encodeURIComponent(entry.term)}`}>Choose this phrase <ArrowUpRight size={15}/></a></div>
      </article>;
    })}</div>
    <p className="collection-footnote">The illustrations and myths are fiction. A source-backed meaning does not verify a phrase’s origin. <a href="/about">Meet the meaning threads.</a></p>
  </main><Footer/></>;
}

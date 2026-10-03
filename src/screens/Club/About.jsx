import { APP_VERSION } from "../../version.js";
import { PRODUCT_NAME, TAGLINE } from "../../content/product.js";
import styles from "./Club.module.css";

export default function About() {
  return (
    <div className={styles.about}>
      <p><strong>{PRODUCT_NAME}</strong> <span className="figures">v{APP_VERSION}</span></p>
      <p>{TAGLINE}</p>
      <h3 className={styles.subheading}>Privacy</h3>
      <p>Your career is stored on this device only. Nothing is sent anywhere, and there are no accounts, adverts or analytics.</p>
      <h3 className={styles.subheading}>Data</h3>
      <p>Player ratings are worked out from public records of what each player was worth, and how old he was, in every top-flight club-season from 1992-93 to 2025-26 and every Championship club-season from 2016-17. They are estimates, not anyone's official numbers.</p>
      <h3 className={styles.subheading}>Licences</h3>
      <p>The code is released under the MIT licence; the dataset is not covered by it. Text is set in your device's own typeface; the vidiprinter is in Courier.</p>
    </div>
  );
}

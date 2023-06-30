import Search from "./classes/search.js";
import { search_lombardia, search_liguria, search_piemonte } from "./dataController.js";
import "dotenv/config";

export const performSearch = async (req, res) => {
  const location = req.query.location;
  switch (location) {
    case "liguria":
      const searchLiguria = new Search(search_liguria, 0, 10, 12);
      // Handle search result for Liguria
      if (req.query.key === process.env.KEY) {
        try {
          await searchLiguria.doSearch()
          // Handle success and send the response
          res.status(200).json({ message: "Search performed successfully for Liguria" });
        } catch (err) {
          console.log("Timeout error occurred for Liguria!", err);
          // Handle error and send the response
          res.status(500).json({ error: "Timeout error occurred on searching Liguria auction data" });
        }
      } else {
        res.status(500).json({ error: "Wrong Key Search! for Liguria" });
      }
      break;
      case "piemonte":
        const searchPiemonte = new Search(search_piemonte, 0, 10, 12);
        // Handle search result for Liguria
        if (req.query.key === process.env.KEY) {
          try {
            await searchPiemonte.doSearch()
            // Handle success and send the response
            res.status(200).json({ message: "Search performed successfully for Piemonte" });
          } catch (err) {
            console.log("Timeout error occurred for Piemonte!", err);
            // Handle error and send the response
            res.status(500).json({ error: "Timeout error occurred on searching Piemonte auction data" });
          }
        } else {
          res.status(500).json({ error: "Wrong Key Search! for Piemonte" });
        }
        break;
      case "lombardia" :
        const searchLombardia = new Search(search_lombardia, 0, 10, 12);
        // Handle search result for Lombardia
        if (req.query.key === process.env.KEY) {
          try {
            await searchLombardia.doSearch()
            // Handle success and send the response
            res.status(200).json({ message: "Search performed successfully for Lombardia" });
          } catch (err) {
            console.log("Timeout error occurred for Lombardia!", err);
            // Handle error and send the response
            res.status(500).json({ error: "Timeout error occurred on searching Lombardia auction data" });
          }
        } else {
          res.status(500).json({ error: "Wrong Key Search! for Lombardia" });
        }
        break;
      default :
      res.status(500).json({error: "Missing location! Currently location available are:", location : {location_9: "liguria", location_10: "lombardia",location_13: "piemonte"}});
  }

};

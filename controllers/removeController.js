import Search from "./classes/search.js";
import { search_lombardia } from "./dataController.js";
import "dotenv/config";

export const removeData = async (req, res) => {
  const location = req.query.location;
  switch (location) {
    case "lombardia" :
    break;
    case "liguria" :
    break;
    case "piemonte":
    break;
    default :
    res.status(500).json({error: "Missing location! Currently location available are:", location : {location_9: "liguria", location_10: "lombardia",location_13: "piemonte"}})
  }
  const search = new Search(search_lombardia, 0, 10, 12);
  if (req.query.key === process.env.KEY) {
    try {
      await search.deleteExpiredElements()
/*       await search.doClusterDataCollection("export_lombardia"); */
      // Handle success and send the response
      res.status(200).json({ message: "🗑 Deleted Expired Elements successfully" });
    } catch (err) {
      console.log("Timeout error occurred", err);
      // Handle error and send the response
      res.status(500).json({ error: "Timeout error occurred" });
    }
  } else {
    res.status(500).json({ error: "Wrong Key to Remove Data!" });
  }
};

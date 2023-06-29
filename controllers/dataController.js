import "dotenv/config";
import Search from "./classes/search.js";

export const region_index = {
    "Lombardia" : 10
}

export const search_config ={
    location : "Lombardia",
    items_per_page: 10
}

export const performData = async (req, res) => {
    const search = new Search(search_config, 0, 10, 12);
    if (req.query.key === process.env.KEY) {
      try {
        await search.doClusterDataCollection("export_lombardia");
        // Handle success and send the response
        res.status(200).json({ message: "Data performed successfully" });
      } catch (err) {
        console.log("Timeout error occurred", err);
        // Handle error and send the response
        res.status(500).json({ error: "Timeout error occurred" });
      }
    } else {
      res.status(500).json({ error: "Wrong Key Search!" });
    }
  };
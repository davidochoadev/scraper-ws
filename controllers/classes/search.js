import fsPromises from 'fs/promises'
import puppeteer from 'puppeteer'
import { Cluster } from 'puppeteer-cluster'
import JSON2CSVParser from 'json2csv/lib/JSON2CSVParser.js'
import { region_index } from '../dataController.js'
import chalk from 'chalk';
export default class Search{

    constructor(config = {location: 1, items_per_page: 10}, debugMode=0, maxCycles=3, threads_num=10){
        this.config = config
        this.debugMode = debugMode
        this.maxCycles = maxCycles
        this.threads_num = threads_num
        this.search_data = []
    }


    async convertToCSV(data, toFileName){
        const csvFields = Object.keys(data[0])
        const parser = new JSON2CSVParser({fields: csvFields, delimiter: ";"})
        var csvData = parser.parse(data)
        await fsPromises.writeFile(`./Data/${toFileName}.csv`, csvData, (err) =>{
            if(err) {
                console.log(err)
                return 0
            }
            console.log(("✅ CSV File was created successfully"))
            return 1
        })
    }
    //auction_threshold, auction_end_threshold
    fabricateQuery(){
        return `https://pvp.giustizia.it/pvp/it/risultati_ricerca.page?tipo_bene=immobili&categoria=&geo=geografica&nazione=ITA&regione=${region_index[this.config.location]}&localita=&indirizzo=&prezzo_da=&prezzo_a=&tribunale=&procedura=&anno=&idInserzione=&ricerca_libera=&disponibilita=&ordinamento=data_pub_decre&ordine_localita=a_z&view=tab&elementiPerPagina=${this.config.items_per_page}&frame4_item=1`
    }

    async grabCurrentRunDuplicates() {
        const auctionCards = await this.mainPage.$$('div.row.tile-blocks > div');
      
        const auctionCardDataPromises = auctionCards.map(async (auctionCard) => {
          const auctionCardLink = await auctionCard.$eval("div.col-xs-12.relative > a", (el) => el.href);
          const auction_id = auctionCardLink.split('&').find((el) => el.includes("contentId")).replace('contentId=', "");
          const auctionCardLocation = await auctionCard.$eval("div.col-xs-12 > div > div > div.anagrafica-risultato", (el) => el.textContent.trim());
          const auctionCardCategory = await auctionCard.$eval("div.col-xs-12.relative > span.categoria", (el) => el.textContent.trim());
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 20);
      
          return { auction_id, auctionCardLink, auctionCardCategory, auctionCardLocation, expirationDate };
        });
      
        return Promise.all(auctionCardDataPromises);
      }
      

    async popupButtonHandler() {
        try{
            const popupButton = await this.mainPage.$x('//*[@id="modalInformativa"]/div/div/div[3]/button')
            if(popupButton){
                await popupButton[0].click()
            }
            return 1
        }
        catch{
            return 0
        }
    }
    
    async grabDataFromdata(cluster, data, id){
        await cluster.goto(data.auctionCardLink, {waitUntil: "networkidle2"})
        await this.popupButtonHandler()
        await cluster.waitForSelector("#annunci > div > div:nth-child(2) > div")
        const auctionData = {}
        auctionData["Numero inserzione"] = (await cluster.evaluate(el => el.textContent, await cluster.$("#header-interna > div > h1:nth-child(2)"))).split(".")[1].trim()
        auctionData["Posizione lotto"] = data.auctionCardLocation
        auctionData["Categoria"] = data.auctionCardCategory
        await cluster.waitForSelector('#annunci > div > div:nth-child(2) > div > div.row')
        const auction_sell_detailsRows = await cluster.$$('#annunci > div > div:nth-child(2) > div > div.row')
        for(const auction_sell_detailsRowHandle of auction_sell_detailsRows){
            if((await cluster.evaluate(el => el.children[0]?.className, auction_sell_detailsRowHandle) === 'col-xs-12 col-md-8 col-lg-6 margin-top-20')) continue
            const childKey = await cluster.evaluate(el => el.children[0]?.textContent, auction_sell_detailsRowHandle)
            const childValue = await cluster.evaluate(el => el.children[1]?.textContent, auction_sell_detailsRowHandle)
            auctionData[childKey?.replaceAll("\t", "").replaceAll("\n", "").trim()] = childValue?.replaceAll("\t", "").replaceAll("\n", "").trim()
        }
        const auction_sell_procedureRows = await cluster.$$('body > div:nth-child(10) > div > div.col-md-9.anagrafica-tribunale > div.row')
        for(const auction_sell_procedureRowHandle of auction_sell_procedureRows){
            var childValue = ""
            if(await cluster.evaluate(el => el.children.length, auction_sell_procedureRowHandle) === 3){
                const childKey = await cluster.evaluate(el => el.children[1]?.textContent, auction_sell_procedureRowHandle)
                if(await cluster.evaluate(el => el.children[2]?.children.length, auction_sell_procedureRowHandle) > 0){
                    childValue = await cluster.evaluate(el => el.children[2]?.children[0].textContent, auction_sell_procedureRowHandle)
                }
                else{
                    childValue = await cluster.evaluate(el => el.children[2]?.textContent, auction_sell_procedureRowHandle)
                }
                auctionData[childKey?.replaceAll("\t", "").replaceAll("\n", "").trim()] = childValue?.replaceAll("\t", "")
            }
            else{
                const childKey = await cluster.evaluate(el => el.children[0]?.textContent, auction_sell_procedureRowHandle)
                if(await cluster.evaluate(el => el.children[1]?.children.length, auction_sell_procedureRowHandle) > 0){
                    childValue = await cluster.evaluate(el => el.children[1]?.children[0].textContent, auction_sell_procedureRowHandle)
                }
                else{
                    childValue = await cluster.evaluate(el => el.children[1]?.textContent, auction_sell_procedureRowHandle)
                }
                if(childKey){
                    auctionData[childKey?.replaceAll("\t", "").replaceAll("\n", "").trim()] = childValue?.replaceAll("\t", "").replaceAll("\n", "").trim()
                }
            }
        }
        const auction_file_data = []
        const auctionFiledataRows = await cluster.$$('div.info-box > div.info-row > span > a')
        for(const auctionFiledataRowHandle of auctionFiledataRows){
            var file = (await cluster.evaluate(el => el?.href, auctionFiledataRowHandle))
            if(file.endsWith('.pdf')){
                auction_file_data.push(file)
            }
        }
        const auctionDetailsRows = await cluster.$('#annunci > div > div.row.margin-top-50 > div.col-md-9.anagrafica-tribunale.padding-bottom-20')
        const auctionDetails = await cluster.evaluate(el => el?.children[2].textContent, auctionDetailsRows)
        auctionData["Dettagli Lotto"] = auctionDetails.trim()
        auctionData["PDF files"] = auction_file_data
        const auctionItemsRows = await cluster.$$('#beni-lotto > div.container.bg-white')
        const auctionItems = []
        for(const auctionItemsRowsHandle of auctionItemsRows){
            const item = {}
            item["Indirizzo"] = (await cluster.evaluate(el => el?.children[0]?.children[1]?.children[0]?.textContent, auctionItemsRowsHandle)).replaceAll("\n", "").replaceAll("\t", "").trim()
            item["Descrizione"] = (await cluster.evaluate(el => el?.children[0]?.children[1]?.children[1]?.textContent, auctionItemsRowsHandle)).replaceAll("\n", "").replaceAll("\t", "").trim()
            const detailsRows = await cluster.$$('#beni-lotto > div.container.bg-white > div > div:nth-child(2) > div.anagrafica-tribunale > div.row')
            const details = {}
            try{
                for(const detail of detailsRows){
                    const key = (await cluster.evaluate(el => el?.children[0].textContent, detail)).replaceAll("\n", "").replaceAll("\t", "").trim()
                    details[key] = (await cluster.evaluate(el => el?.children[1].textContent, detail)).replaceAll("\n", "").replaceAll("\t", "").trim()
                }
            }
            catch(err){
                console.log(err)
            }
            item["Dettagli"] = details
            auctionItems.push(item)
        }
        auctionData["Beni lotto"] = auctionItems
        const auction_imgs = []
        for(var i = 0; i < auctionItems.length; i++ ){
            const auctionImgsdataRows = await cluster.$$(`#carousel-${i} > div.scroller > a`)
            for(const auctionFileImgsRowHandle of auctionImgsdataRows){
                var img = (await cluster.evaluate(el => el?.children[0]?.src, auctionFileImgsRowHandle))
                auction_imgs.push(img)
            }
        }
        auctionData["Immagini"] = auction_imgs
        const date = auctionData["Termine presentazione offerta"].replaceAll("/", "-").split(" ")[0]
        const auctionDate = new Date(date.split("-").reverse().join(","))
        const minDate = new Date(new Date().getDate() + 40 * 24 * 60 * 60 * 1000)
        if(auctionDate.getDate() > minDate.getDate()){
            console.log(chalk.green("✅ The termination date of the auction is within the time limit"))
            this.search_data.push(auctionData)
        }
        return 0
    }
    
    async getDuplicates() {
        try {
          console.log(chalk("Trying to read the storage.json file"))
          const response = await fsPromises.readFile('Temp/storage.json', { encoding: "utf-8" });
          const oldAuctionData = JSON.parse(response);
          console.log('Current file length: ' + oldAuctionData.length);
          return oldAuctionData;
        } catch (error) {
          console.log(chalk.redBright('⚙️  Missing file! Creating a new storage.json...'));
          return [];
        }
      }
      

    async doClusterDataCollection(file_name){
        console.log(chalk.yellowBright("🏁 Starting Cluster Data Collection..."));
        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_PAGE,
            maxConcurrency: this.threads_num,
            puppeteerOptions: {
                headless: !this.debugMode
            },
            skipDuplicateUrls: true,
            retryLimit: 1
          })
        await cluster.task(async ({page, data: data, worker}) =>{
            await this.grabDataFromdata(page, data, worker.id)
        })
        const duplicates = await this.getDuplicates()
        var checkedduplicates = 0
        var unCheckedduplicates = 0
        duplicates.every(async (data, i) =>{
            try{
                await cluster.execute(data)
                checkedduplicates++
                console.log(chalk.blue(`⚙️  Data number ${i} has been processed. Total progress: ${(checkedduplicates / (duplicates.length.toFixed(0) - unCheckedduplicates) * 100).toFixed(2)}%`))
            }
            catch(err){
                try{
                    console.log(chalk.redBright(`⚠️  Data number ${i} encountered an error. The program will try one more time before stopping`))
                    await cluster.execute(data)
                }
                catch(err){
                    console.log(err)
                    // console.log("Failed to evaluate data number: " + i)
                }
            }
        })
        await cluster.idle()
        await cluster.close()
        await this.convertToCSV(this.search_data, file_name)
        console.log(chalk.greenBright(`✅ ${checkedduplicates} have been successfully fetched from a total of ${duplicates.length}. All data has been saved in ${file_name}.csv`))
        return 0
    }

    async doSearch() {
        const newFileName = `new_results.json`;
        console.log(chalk.yellow("🔍 Starting Search..."));
        var oldAuctionData = await this.getDuplicates();
        var url = this.fabricateQuery(this.config.location, this.config.items_per_page);
        const browser = await puppeteer.launch({ headless: !this.debugMode });
        this.mainPage = await browser.newPage();
        await this.mainPage.goto(url, { waitUntil: 'networkidle2' });
        let currentPage = 1;
        let lastPage = 0;
        let currentRunDuplicates = [];
        const oldDuplicates = oldAuctionData.filter((data) => data.auction_id);
        console.log("Result length: " + oldDuplicates.length);
        while (currentPage <= this.maxCycles) {
          console.log("Current page number: " + currentPage);
          await this.popupButtonHandler();
          const runDuplicates = await this.grabCurrentRunDuplicates();
          currentRunDuplicates = currentRunDuplicates.concat(
            runDuplicates.filter((data) => !oldDuplicates.some((oldData) => oldData.auction_id === data.auction_id))
          );          
          lastPage = currentPage;
          currentPage++;
          console.log('Current duplicates length: ' + currentRunDuplicates.length);
          url = url.replace(`frame4_item=${lastPage}`, `frame4_item=${currentPage}`);
          await this.mainPage.goto(url, { waitUntil: 'networkidle2' });
        }
        await browser.close();
        const newDuplicates = oldAuctionData.concat(currentRunDuplicates.filter((data) => !oldAuctionData.includes(data)));
        if(currentRunDuplicates.length > 0) {
            try {
            await fsPromises.unlink(`Temp/${newFileName}`);
            await fsPromises.writeFile('Temp/storage.json', JSON.stringify(newDuplicates));
            await fsPromises.writeFile(`Temp/${newFileName}`, JSON.stringify(currentRunDuplicates));
            console.log(chalk.green("✅ Correctly created ", newFileName));
            console.log(chalk.green("✅ Correctly compiled storage.json"));
            } catch (err) {
            console.log(err);
            return 0;
            }
        } else {
            // If the lenght of the currentRunDuplicates is equal to 0 
            try {
            // We delete the previous newFileName to create a new empty one.
              await fsPromises.writeFile(`Temp/${newFileName}`, '[]');
              console.log(chalk.green("✅ Correctly created empty", newFileName));
            } catch (err) {
              console.log(err);
              return 0;
            }
          }
      }

      async deleteExpiredElements() {
        console.log(chalk.yellow("🗑️ Removing expired elements from storage.json..."));
        const tempFilePath = 'Temp/storage.json';
        const oldAuctionData = await this.getDuplicates();
        const currentDate = new Date();
        
        // Filter out expired elements
        const updatedData = oldAuctionData.filter((data) => {
          const expirationDate = new Date(data.expirationDate);
          return expirationDate >= currentDate;
        });
        
        try {
          // Write updated data back to storage.json
          await fsPromises.writeFile(tempFilePath, JSON.stringify(updatedData, null, 2));
          console.log(chalk.green("✅ Expired elements have been removed from storage.json."));
        } catch (err) {
          console.error(`Error writing to ${tempFilePath}:`, err);
        }
      }
}
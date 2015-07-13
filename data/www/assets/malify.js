/*eslint-env browser */
/*eslint no-console:0 */

(function malify() {
    "use strict";
    /**
     * Click Handler Factory
     * @param  {DOMElement} element The anime details element
     * @return {Function}           The Click Handler
     */
    function makeAnchorClickHandler(element) {
        var data, malID, malSlug,
            animeTitle = element.querySelector("#anime-title"),
            animeImage = element.querySelector("#anime-image"),
            animeSynopsis = element.querySelector("#anime-synopsis"),
            animeEpisodeCount = element.querySelector("#anime-episodeCount"),
            animeDate = element.querySelector("#anime-date"),
            animeGenres = element.querySelector("#anime-genres");

        /**
         * Extract anime details from a MAL url
         * @param  {String} url The MAL url
         * @return {Array}      [Anime ID, Anime Name]
         */
        function extractDetails(url) {
            return url.match(/(?:http:\/\/(?:www.)?)?myanimelist.net\/anime\/(\d+)\/([\w\d\(\)_]+)/i);
        }

        /**
         * Insert anime data into the DOM
         * @param  {Object\JSON} anime The parsed API result
         * @return {void}
         */
        function populateDetails(anime) {
            animeTitle.textContent = anime.title;
            animeImage.src = anime.cover_image;
            animeSynopsis.textContent = anime.synopsis;
            animeEpisodeCount.textContent = anime.episode_count;
            animeDate.textContent = anime.started_airing;
            animeGenres.textContent = anime.genres
                    .map(function (item) {
                        return item.name;
                    })
                    .join(", ");
        }

        return function click() {
            var animeDetails;
            if (data) {
                console.log("DATA:", data);
                return populateDetails(data);
            }

            animeDetails = extractDetails(this.href);
            malID = animeDetails[1];
            malSlug = animeDetails[2];

            window.fetch("https://hbrd-v1.p.mashape.com/search/anime?query=" + malSlug, {headers: {
                "Accept": "application/json",
                "X-Mashape-Key": "pOnzc9sQllmshN4WOeZ9MHUH49Znp1sYQV9jsnyBgJtYLYJfeq"
              }})
                .then(function (response) {
                    return response.json();
                })
                .then(function (parsed) {
                    var anime = parsed[0];
                    if (anime.mal_id == malID) {
                        data = anime;
                        hover.call(this);
                        return true;
                    }
                    throw new Error("Mal ID: "
                            + malID
                            + " didn't match the Hummingbird result: "
                            + anime.mal_id);
                })
                .catch(function (ex) {
                    console.error(ex.message);
                });
        };
    }

    // Wait for the DOM to load
    document.addEventListener("DOMContentLoaded", function () {
        // Populating for testing...
        var anchorList = document.querySelector("#list8 > ul > li > a");

        var detEl = document.getElementById("anime-details");
        var anchors = Array.prototype.slice.call(anchorList);
        anchors.forEach(function (anchor) {
            anchor.addEventListener("click", makeAnchorClickHandler(detEl));
        });

    });
})();

/*eslint-env browser */
/*eslint no-console:0 */

(function malify() {
    "use strict";
    /**
     * Click Handler Factory
     * @param  {DOMElement} element The anime details element
     * @param  {String}     malLink The URL to MAL
     * @return {Function}           The Click Handler
     */
    function makeAnchorClickHandler(element) {
        var data, malID, malSlug,
            attempt = 0,
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

        function createTitle(title, link) {
            var a = document.createElement("a");
            a.href = link;
            a.textContent = title;
            animeTitle.replaceChild(a, animeTitle.firstChild);
        }

        /**
         * Insert anime data into the DOM
         * @param  {Object\JSON} anime The parsed API result
         * @return {void}
         */
        function populateDetails(anime, url) {
            createTitle(anime.title, url);
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

        return function click(ev) {
            var animeDetails, collectData;
            if (ev) {
                ev.preventDefault();
            }
            if (data) {
                return populateDetails(data, this.href);
            }

            animeDetails = extractDetails(this.href);
            malID = animeDetails[1];
            malSlug = animeDetails[2];

            collectData = function (parsed) {
                var anime = parsed[attempt];
                    if (anime.mal_id == malID) {
                        data = anime;
                        click.call(this);
                        return true;
                    }
                    createTitle("Not Found; Click Here", this.href);
                    throw new Error("Mal ID: "
                            + malID
                            + " didn't match the Hummingbird result: "
                            + anime.mal_id);
            };

            window.fetch("https://hbrd-v1.p.mashape.com/search/anime?query=" + malSlug, {headers: {
                "Accept": "application/json",
                "X-Mashape-Key": "pOnzc9sQllmshN4WOeZ9MHUH49Znp1sYQV9jsnyBgJtYLYJfeq"
            }})
            .then(function (response) { return response.json(); })
            .then(collectData.bind(this))
            .catch(function (ex) {
                console.error(ex.message);
                console.info("Next result to attempt:", ++attempt);
            });
        };
    }

    // Wait for the DOM to load
    document.addEventListener("DOMContentLoaded", function () {
        var anchorList = document.querySelectorAll("#list8 > ul > li > a");
        var detEl = document.getElementById("anime-details");
        var anchors = Array.prototype.slice.call(anchorList);
        anchors.forEach(function (anchor) {
            anchor.addEventListener("click", makeAnchorClickHandler(detEl));
        });

    });
})();

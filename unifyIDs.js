'use strict';

exports.type = 'full';

exports.active = true;

exports.description = 'removes unused IDs and keep others unique';

exports.params = {
    remove: true,
    minify: true,
    prefix: ''
};

var referencesProps = require('svgo/plugins/_collections').referencesProps,
    regReferencesUrl = /^url\(("|')?#(.+?)\1\)$/,
    regReferencesHref = /^#(.+?)$/,
    regReferencesBegin = /^(\w+?)\./,
    styleOrScript = ['style', 'script'];

/**
 * Remove unused and minify used IDs
 * (only if there are no any <style> or <script>).
 *
 * @param {Object} item current iteration item
 * @param {Object} params plugin params
 *
 * @author Kir Belevich, Alex Batalov
 */

var currentID,
    idIndex = 0

exports.fn = function(data, params) {

    var currentIDstring,
        IDs = {},
        referencesIDs = {},
        idPrefix = 'id-', // prefix IDs so that values like '__proto__' don't break the work
        hasStyleOrScript = false;

    /**
     * Bananas!
     *
     * @param {Array} items input items
     * @return {Array} output items
     */
    function monkeys(items) {

        for (var i = 0; i < items.content.length; i++) {

            var item = items.content[i],
                match;

            // check if <style> of <script> presents
            if (item.isElem(styleOrScript)) {
                hasStyleOrScript = true;
            }

            // …and don't remove any ID if yes
            if (!hasStyleOrScript) {

                if (item.isElem()) {

                    item.eachAttr(function(attr) {
                        // save IDs
                        if (attr.name === 'id') {
                            if (idPrefix + attr.value in IDs) {
                                item.removeAttr('id');
                            } else {
                                IDs[idPrefix + attr.value] = item;
                            }
                        }

                        // save IDs url() references
                        else if (referencesProps.indexOf(attr.name) > -1) {
                            match = attr.value.match(regReferencesUrl);

                            if (match) {
                                if (referencesIDs[idPrefix + match[2]]) {
                                    referencesIDs[idPrefix + match[2]].push(attr);
                                } else {
                                    referencesIDs[idPrefix + match[2]] = [attr];
                                }
                            }
                        }

                        // save IDs href references
                        else if (
                            attr.name === 'xlink:href' && (match = attr.value.match(regReferencesHref)) ||
                            attr.name === 'begin' && (match = attr.value.match(regReferencesBegin))
                        ) {
                            if (referencesIDs[idPrefix + match[1]]) {
                                referencesIDs[idPrefix + match[1]].push(attr);
                            } else {
                                referencesIDs[idPrefix + match[1]] = [attr];
                            }
                        }
                    });
                }

                // go deeper
                if (item.content) {
                    monkeys(item);
                }

            }

        }

        return items;

    }

    data = monkeys(data);

    if (!hasStyleOrScript) {


        for (var k in referencesIDs) {
            if (IDs[k]) {

                // replace referenced IDs with the minified ones
                if (params.minify) {

                    currentIDstring = generateID();

                    IDs[k].attr('id').value = currentIDstring;

                    referencesIDs[k].forEach(function(attr) {
                        k = k.replace(idPrefix, '');

                        attr.value = attr.value
                            .replace('#' + k, '#' + currentIDstring)
                            .replace(k + '.', currentIDstring + '.');
                    });

                }

                // don't remove referenced IDs
                delete IDs[idPrefix + k];

            }
        }

        // remove non-referenced IDs attributes from elements
        if (params.remove) {
            for(var ID in IDs) {
                IDs[ID].removeAttr('id');
            }

        }

    }

    return data;
};


function generateID(){
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  return 'id-' + s4() + s4();
}

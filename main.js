$(() => {

    const CDNPrefix = 'https://cdn.melvor.net/core/v018/';
    const $importField = $('#txtImport');
    const $exportField = $('#txtExport');

    var saveData;
    var itemMap;
    var hasBorders;
    var lastToolTip;


    $importField.keyup(function() {

        $importField.prop('disabled', true);
        $('#btnExport').prop('disabled', false);
        $('.banktab').html('');

        try {

            saveData = loadSaveData($importField.val())
            console.log(saveData);
            hasBorders = !saveData.SETTINGS.bank.bankBorder;

            itemMap = getItemMap(saveData);

            populateFromItemMap(itemMap);

            var bank = saveData.bank;
            bank.forEach((item, index) => {
                $("#bank-item-qty-" + item.id).html(item.qty);
            });

            tippy('.item', {
                content: 'Loading...',
                allowHTML: true,
                interactive: true,
                appendTo: "parent",
                onCreate: function(instance) {

                    itemID = $(instance.reference).attr('id').substring(5);
                    itemName = melvorData['items'][itemID].name;
                    itemCategory = melvorData['items'][itemID].category;
                    wikiLink = 'https://wiki.melvoridle.com/index.php?title=' + itemName.replace('#', '');

                    tooltip = '<a href="' + wikiLink + '" target="_new">' + itemName + '</a><br /><small class="badge-pill">' + itemCategory + '</small>';
                    instance.setContent(tooltip);
                },
                onShow: function(instance) {
                    lastTooltip = instance;
                },
            });


            $(".banktab").sortable({
                items: ".item",
                connectWith: ".banktab",
                start: function(event, ui) {
                    lastTooltip.disable();
                },
                stop: function(event, ui) {
                    lastTooltip.enable();
                },
                deactivate: function(event, ui) {
                    var tab = $(ui.item).parent().attr('id').substring(4);
                    reorderTab(tab);
                },
                receive: function(event, ui) {
                    var toTab = $(this).attr('id').substring(4);
                    var item = $(ui.item).attr('id').substring(5);
                    itemMap.set(parseInt(item), parseInt(toTab));
                    reorderTab(toTab);
                    if (parseInt(item) < 0) {
                        console.log(this);
                        console.log(ui);
                        alert("ERROR: Corruption occured. Please report this glitch to TexasMd91@gmail.com. Do not export.");
                    }

                }
            }).disableSelection();

        } catch (e) {
            // TODO: Error Message
            console.log(e);
            $importField.prop('disabled', false);
            $('#btnExport').prop('disabled', true);
            return;
        }
    });

    $('#btnExport').button().click(function() {
        var newSaveData = saveData;

        try {

            var bank = saveData.bank;
            bank.forEach((item, index) => {
                if (itemMap.has(item.id)) {
                    if (itemMap.get(item.id) != -1) {
                        bank[index].tab = itemMap.get(item.id);
                    } else {
                        bank[index].tab = 0;
                    }
                }
            });
            newSaveData.bank = bank;

            var newDefaultItemTab = [];
            itemMap.forEach((tab, itemID) => {
                if (tab != -1) {
                    if (itemID < 0) {

                        console.log(itemMap);
                        console.log(tab);
                        console.log(itemID);
                        alert("ERROR: Corruption occured. Please report this glitch to TexasMd91@gmail.com. Do not export.");
                    }
                    newDefaultItemTab.push({
                        "itemID": itemID,
                        "tab": tab
                    })
                }
            })

            newSaveData.SETTINGS.bank.defaultItemTab = newDefaultItemTab;



            var newSaveStr = btoa(pako.gzip(JSON.stringify(newSaveData), { to: 'string' }));
            $exportField.val(newSaveStr);
            $exportField.prop('disabled', false);
        } catch (e) {
            // TODO: Error Message 
            $exportField.val('');
            $exportField.prop('disabled', true);
            console.log(e);
            alert("Error");
            return;
        }
    });

    function getItemMap(saveData) {
        itemMap = new Map();

        melvorData['items'].forEach(function(item, id) {
            itemMap.set(id, -1)
        });

        for (let item of saveData.SETTINGS.bank.defaultItemTab) {
            itemMap.set(item['itemID'], item['tab']);
        }

        return itemMap;
    }

    function reorderTab(tab) {
        $('#tab-' + tab + ' > .item').sort(function(a, b) {
            aId = parseInt($(a).attr('id').substring(5));
            bId = parseInt($(b).attr('id').substring(5));
            if (aId < bId) {
                return -1;
            } else {
                return 1;
            }
        }).appendTo('#tab-' + tab);
    }

    function populateFromItemMap(itemMap) {

        itemMap.forEach((tab, id) => {
            $("#tab-" + tab).append(itemLink(id, hasBorders));
        })

        return true;
    }

    function itemLink(itemID, hasBorders) {
        itemName = melvorData['items'][itemID]['name'];
        articleName = itemName.replace('#', '');
        return (
            '<div class="item' + (hasBorders ? " hasborder" : "") + '" id="item-' + itemID + '" aria-expanded="false"><img width="48px" height="48px" src="' +
            CDNPrefix + melvorData['items'][itemID]['media'] + '" /><div class="font-size-sm text-white text-center"><small class="badge-pill bg-secondary" id="bank-item-qty-' + itemID + '">0</small></div></div>'
        );
    }

    function loadSaveData(saveData) {
        // Quit if blank save.
        if (!saveData) {
            // TODO: Error Message
            return false;
        }

        // Quit if corrupt save (unable to un-base64 and un-gzip).
        try {
            // https://stackoverflow.com/a/41106346/606974
            saveJSON = JSON.parse(pako.ungzip(Uint8Array.from(atob(saveData), c => c.charCodeAt(0)), { to: 'string' }));
        } catch (err) {
            // TODO: Error Message
            return false;
        }

        // Quit if it's not a Melvor Idle save
        if (!saveJSON.hasOwnProperty('accountGameVersion')) {
            // TODO: Error Message
            return false;
        }

        // Quit if it's an older game version
        if (saveJSON['accountGameVersion'] < 121) {
            // TODO: Error Message
            return false;
        }

        return saveJSON;
    }
});
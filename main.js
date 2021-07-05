$(() => {

    const CDNPrefix = 'https://cdn.melvor.net/core/v018/';
    const $importField = $('#txtImport');
    const $exportField = $('#txtExport');

    var saveData;
    var itemMap;
    var hasBorders;

    $importField.keyup(function() {

        $importField.prop('disabled', true);
        $('#btnExport').prop('disabled', false);
        $('.banktab').html('');

        try {

            saveData = loadSaveData($importField.val())
            hasBorders = !saveData.SETTINGS.bank.bankBorder;

            itemMap = getItemMap(saveData);

            populateFromItemMap(itemMap);

            var bank = saveData.bank;
            bank.forEach((item, index) => {
                console.log("#bank-item-qty-" + item.id);
                $("#bank-item-qty-" + item.id).html(item.qty);
            });




            $(".banktab").sortable({
                connectWith: ".banktab",
                receive: function(event, ui) {
                    var toTab = $(this).attr('id').substring(4);
                    var item = $(ui.item).attr('id').substring(5);
                    itemMap.set(parseInt(item), parseInt(toTab));
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

        console.log(saveData.SETTINGS.bank.defaultItemTab);
        for (let item of saveData.SETTINGS.bank.defaultItemTab) {
            itemMap.set(item['itemID'], item['tab']);
        }

        return itemMap;
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
            '<div class="item' + (hasBorders ? " hasborder" : "") + '" id="item-' + itemID + '"><img width="48px" height="48px" src="' +
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
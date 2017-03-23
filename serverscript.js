var catalogVersion = "0.9";
var LVL_UP_PAC = "LVL_UP_PAC";
var MON_SUB_PAC = "MON_SUB_PAC";
var UserInventoryMax = 20;
var enchantPriceInIP = 10;
var spDefault = 10;
var slDefault = 10;
var cpDefault = 10;
var lpDefault = 20;
function rand(from, to) {
    return Math.floor((Math.random() * to) + from);
}
handlers.PurchaseCharacter = function (args) {
    log.info("PlayFabId " + currentPlayerId);
    log.info("ClassType " + args.ClassType);
    log.info("ClassStatus " + args.ClassStatus);
    var classType = args.ClassType;

    var goldPrice = args.GemPrice;
    log.info("goldPrice " + goldPrice);
    var allChars = server.GetAllUsersCharacters({
        "PlayFabId": currentPlayerId
    });
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var currentGold = userInv.VirtualCurrency.GP;
    if (currentGold < goldPrice) {
        return { "Error": "Insufficient Gem" };
    }
    if (goldPrice > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GP",
                "Amount": goldPrice
            }
        );
    }

    var grantCharResult = server.GrantCharacterToUser({
        "PlayFabId": currentPlayerId,
        "CatalogVersion": catalogVersion,
        "CharacterName": classType,
        "CharacterType": classType,
        "ItemId": classType
    });
    var characterId = grantCharResult.CharacterId;
    log.info("characterId " + characterId);
    var classStatus = JSON.parse(args.ClassStatus);
    var luck = classStatus["Luck"];
    delete classStatus.Luck;
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": classStatus
    });
    var isActive = allChars.Characters.length == 0;
    var isLeader = allChars.Characters.length == 0;
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": { "Luck": luck, "IsActive": isActive, "IsLeader": isLeader, "Level": 0}
    });
    server.UpdateCharacterData({
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "Data": { "SoulAttackLevel": 0, "SoulHitPointLevel": 0 }
    });
    var itemId = "";
    if (classType == "Rogue") {
        itemId = "Dagger_00";
    }
    else if (classType == "Hunter") {
        itemId = "Bow_00";
    }
    else if (classType == "Warrior" || classType == "SpellSword" || classType == "Paladin") {
        itemId = "TwoHandSword_00";
    }
    else if (classType == "Sorcerer" || classType == "Warlock" || classType == "Priest") {
        itemId = "Staff_00";
    }

    log.info("itemId " + itemId);
    var grantItemResult = server.GrantItemsToCharacter({
        "Annotation": "Char Creation Basic Item",
        "CatalogVersion": catalogVersion,
        "PlayFabId": currentPlayerId,
        "CharacterId": characterId,
        "ItemIds": [itemId]
    });
    log.info("grantItemResult " + JSON.stringify(grantItemResult));
    return { "CharacterId": characterId };
};
handlers.KilledMob = function (args)
{
    var mobType = args.MobType;
    var townLevel = parseInt(args.TownLevel);
    var dungeonLevel = parseInt(args.DungeonLevel) + 1;
    var sl = Math.floor(slDefault * Math.pow(1.2, (townLevel * 100 + dungeonLevel)));
    var userInventory = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var items = [];
    var realItems = [];
    var invMax = UserInventoryMax;
    var userData = server.GetUserData(
        {
            "PlayFabId": currentPlayerId,
            "Keys": [
                "UserInventoryMax"
            ]
        }
    );
    if (userData.UserInventoryMax && userData.UserInventoryMax.Value)
    {
        invMax = (userData.UserInventoryMax.Value);
    }
    if (userInventory.Inventory.length < invMax)
    {
        var townId = "Town_" + args.TownLevel;
        var townItem = server.EvaluateRandomResultTable(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": currentPlayerId,
                "TableId": townId
            }
        );
        if (townItem.ResultItemId != "Nothing") {
            log.info("item " + JSON.stringify(townItem));
            items.push(townItem.ResultItemId);
        }
        if (items.length > 0) {
            var itemGrantResult = server.GrantItemsToUser(
                {
                    "CatalogVersion": catalogVersion,
                    "PlayFabId": currentPlayerId,
                    "ItemIds": items
                }
            );
            realItems = realItems.concat(itemGrantResult["ItemGrantResults"]);
            //add random stat here
            for (var i = 0; i < itemGrantResult.length; i++) {
                //var arr = []
                //while(arr.length < 3){
                //    var randomnumber = rand(0, 7);
                //    if(arr.indexOf(randomnumber) > -1) continue;
                //    arr[arr.length] = randomnumber;
                //}
                server.UpdateUserInventoryItemCustomData({
                    PlayFabId: currentPlayerId,
                    CharacterId: characterId,
                    ItemInstanceId: itemToEnchant.ItemInstanceId,
                    Data: { "Enchant": 0, "Strength": 10, "Dexterity": 10 },
                });
            }
        }
    }
    
    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "SL",
            "Amount": sl
        }
    );
    var result = { "SL": sl };
    if (realItems.length > 0)
    {
        result.Items = realItems;
    }
    return result;
};
handlers.OpenTreasureBox = function (args) {
    //args.TownId should be int
    var townLevel = parseInt(args.TownLevel);
    var thisTownId = "Town_" + townLevel;
    var nextTownId = "Town_" + (townLevel < 29 ? townLevel + 1 : townLevel);
    log.info("thisTownId " + thisTownId);
    log.info("nextTownId " + nextTownId);
    var items = [];

    var nextTownItem = server.EvaluateRandomResultTable(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "TableId": nextTownId
        }
    );
    if (nextTownItem.ResultItemId != "Nothing") {
        log.info("item " + JSON.stringify(nextTownItem));
        items.push(nextTownItem.ResultItemId);
    }
    else {
        var thisTownItem = server.EvaluateRandomResultTable(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": currentPlayerId,
                "TableId": thisTownId
            }
        );
        if (thisTownItem.ResultItemId != "Nothing") {
            log.info("item " + JSON.stringify(thisTownItem));
            items.push(thisTownItem.ResultItemId);
        }
    }

    var realItems = [];
    if (items.length > 0) {
        for (var i = 0; i < items.length; i++) {
            var itemGrantResult = server.GrantItemsToUser(
                {
                    "CatalogVersion": catalogVersion,
                    "PlayFabId": currentPlayerId,
                    "ItemIds": items
                }
            );
            realItems = realItems.concat(itemGrantResult["ItemGrantResults"]);
            log.info("realItems " + JSON.stringify(realItems));
        }
    }

    var result = { "Items": realItems };
    return result;
};
handlers.TakeScroll = function (args) {
    //args.TownId should be int
    var townLevel = parseInt(args.TownLevel);
    var dungeonLevel = parseInt(args.DungeonLevel) + 1;
    var sp = Math.floor(spDefault * Math.pow(1.2, (townLevel * 100 + dungeonLevel)));
    server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "SP",
            "Amount": sp
        }
    );
    var result = { "SP": sp };
    return result;
};
handlers.DecomposeItems = function (args) {
    var items = JSON.parse(args.Items);
    var totalPrice = 0;
    for (var i = 0; i < items.length; i++)
    {
        var itemInstance = items[i];
        var consumeItemResult = server.ConsumeItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": itemInstance.ItemInstanceId,
            "ConsumeCount": 1
        });
        totalPrice += itemInstance.UnitPrice;
    }
    var goldGainResult = server.AddUserVirtualCurrency(
        {
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "IP",
            "Amount": totalPrice
        }
    );
    return { "IP": totalPrice };
};
handlers.UpgradeItem = function (args) {
    
    var itemToUpgrade = JSON.parse(args.ItemInstance);
    var str = itemToUpgrade.ItemId;
    var rank = str.substring(str.lastIndexOf("_") + 1, str.lastIndexOf("_") + 2);
    rank = parseInt(rank);
    rank++;
    var RPToEnchant = Math.floor(enchantPriceInIP * Math.pow(1.4, rank));

    var newItemId = str.substr(0, str.lastIndexOf("_")) + "_" + rank + str.substr(str.lastIndexOf("_") + 2);

    var userInventory = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    //check if sufficient fund
    if (userInventory.VirtualCurrency == null
        || userInventory.VirtualCurrency.RP == null
        || parseInt(userInventory.VirtualCurrency.RP) < RPToEnchant) {
        log.info("Insufficient Fund");
        return { "Error": "Insufficient Fund" };
    }
    server.SubtractUserVirtualCurrency({
        "PlayFabId": currentPlayerId,
        "VirtualCurrency": "RP",
        "Amount": RPToEnchant
    });
    server.ConsumeItem({
        "PlayFabId": currentPlayerId,
        "ItemInstanceId": itemToUpgrade.ItemInstanceId,
        "ConsumeCount": 1
    });
    log.info("newItemId " + newItemId);
    var itemGrantResults = server.GrantItemsToUser({
        CatalogVersion: catalogVersion,
        PlayFabId: currentPlayerId,
        Annotation: "ItemUpgrade",
        ItemIds: [newItemId]
    });
    log.info("itemGrantResults " + JSON.stringify(itemGrantResults));
    return { "NewItem": JSON.stringify(itemGrantResults.ItemGrantResults[0]) };
};
handlers.EnchantItem = function (args) {
    var requiredCard = args.RequiredCard;
    var requiredCoin = args.RequiredCoin;
    var itemToEnchant = JSON.parse(args.ItemInstance);
    var enchantLevel = 0;

    if (itemToEnchant.CustomData != null && itemToEnchant.CustomData.Level != null) {
        enchantLevel = parseInt(itemToEnchant.CustomData.Level);
    }

    var userInventory = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });

    //check if sufficient fund
    if (userInventory.VirtualCurrency == null
        || userInventory.VirtualCurrency.GD == null
        || parseInt(userInventory.VirtualCurrency.GD) < requiredCoin) {
        log.info("Insufficient Fund");
        return { "Error": "Insufficient Fund" };
    }
    if (requiredCard > 0)
    {
        server.ConsumeItem({
            "PlayFabId": currentPlayerId,
            "ItemInstanceId": itemToEnchant.ItemInstanceId,
            "ConsumeCount": requiredCard
        });
    }
    if (requiredCoin > 0)
    {
        server.SubtractUserVirtualCurrency({
            "PlayFabId": currentPlayerId,
            "VirtualCurrency": "GD",
            "Amount": requiredCoin
        });
    }
    
    enchantLevel++;
    var enchantSuccessResult = server.UpdateUserInventoryItemCustomData({
        PlayFabId: currentPlayerId,
        ItemInstanceId: itemToEnchant.ItemInstanceId,
        Data: { "Level": enchantLevel },
    });
    return {};
};
handlers.SummonItem = function (args) {
    var goldPrice = 1000;
    var userInv = server.GetUserInventory({
        "PlayFabId": currentPlayerId
    });
    var currentGold = userInv.VirtualCurrency.GD;
    if (currentGold < goldPrice) {
        return { "Error": "Insufficient Gem" };
    }
    if (goldPrice > 0) {
        server.SubtractUserVirtualCurrency(
            {
                "PlayFabId": currentPlayerId,
                "VirtualCurrency": "GD",
                "Amount": goldPrice
            }
        );
    }
    var items = [];
    var randomItem = server.EvaluateRandomResultTable(
            {
                "CatalogVersion": catalogVersion,
                "PlayFabId": currentPlayerId,
                "TableId": dropTableId
            }
        );
    if (randomItem.ResultItemId != "Nothing") {
        log.info("item " + JSON.stringify(randomItem));
        items.push(randomItem.ResultItemId);
    }
    var realItems = [];
    var itemGrantResult = server.GrantItemsToUser(
        {
            "CatalogVersion": catalogVersion,
            "PlayFabId": currentPlayerId,
            "ItemIds": items
        }
    );
    realItems = realItems.concat(itemGrantResult["ItemGrantResults"]);
    var result = {};
    result.Items = realItems;
    return result;
};
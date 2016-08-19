/*
Created By	: Chandrabhan Singh
Date		: 2016-08-19
Description	: A jquery plugin to add tags from pre defined data.

*/
var delcarationAutoSuggest = function ($) {

    //Control initilization
    $.fn.simplyTag = function (options,itemToAdd) {
        //if the first input is Object initilize the control
        if (options != undefined && typeof options === 'object') {
            var settings = $.extend({
                // These are the defaults.
                allowSpecialChar: false,
                isLocal: true,
                dataSource: null,
                key: 'key',
                value: 'value',
            }, options);

            var _placeHolder = this;
            _placeHolder.css('display', 'none');
            _placeHolder.wrap("<div class='simply-tag-root'></div>");
            _placeHolder.parent().prepend("<span class='simply-tag-loader'></span>");
            _placeHolder.parent().prepend("<input id='txt-input' dir='auto' spellcheck='true' type='text' size='1' placeholder='' autocomplete='off'>");
            _placeHolder.parent().prepend("<span class='simply-tags'></span>");
            _placeHolder.parent().append("<div class='simply-tag-suggestion-root' style='left: 0px; top: 100%; display: none; position: absolute; z-index: 1000;'></div>");
            _placeHolder.parent().append("<span style='display:none' class='simply-tag-current' data-type='valid'></span>");
            _bindEvents(_placeHolder, settings);

        } else {
            //here we handle function to operate on already initilise control
            var option = options == null ? '' : options.toLowerCase();
            switch (option) {
                case 'getitems':
                    return _getSelectedItems(this);

                case 'additem':
                    return _addSelectedItems(this, itemToAdd);

                default:
            }
        }
        return true;
    }

    var _getSelectedItems = function (control) {
        var _placeHolder = control;
        var tagContainer = _placeHolder.parent().find('.simply-tags');
        if (tagContainer.length == 0)
            throw "Simply tag was not initilized. This operation cannot be performed!";

        var dataToCollect = tagContainer.find('.tag');
        var validData = [];
        var invalidData = [];
        var invalidjsonTemplate = '{"value":"{0}"}';
        var validjsonTemplate = '{"key":"{0}","value":"{1}"}';

        $.each(dataToCollect, function (index, value) {
            if ($(value).hasClass("valid")) {
                var jsonValid = invalidjsonTemplate.replace("{0}", $(value).attr('data-key'));
                jsonValid = jsonValid.replace("{1}", $(value).attr('data-display'));
                validData.push(JSON.parse(jsonValid));
            }
            else {
                var jsonInvalid = invalidjsonTemplate.replace("{0}", $(value).attr('data-display'));
                invalidData.push(JSON.parse(jsonInvalid));
            }

        });
        var collectedData = { "validTags": validData, "invalidTags": invalidData, "textBoxValue": _placeHolder.siblings('#txt-input').val() };
        return collectedData;
    }

    var _addSelectedItems = function (control, itemToAdd)
    {
        var _placeHolder = control;
        var tagContainer = _placeHolder.parent().find('.simply-tags');
        if (tagContainer.length == 0)
            throw "Simply tag was not initilized. This operation cannot be performed!";
       
        if (itemToAdd['key'] !== undefined && itemToAdd['value'] !== undefined)
            _addItemTotagList(_placeHolder, itemToAdd['key'], itemToAdd['value'], 'valid');
    }

    //#region Events
    var _bindEvents = function (placeHolder, settings) {
        placeHolder.parent().find('#txt-input').on("keyup", function (e) {
            var txtElement = $(this);
            var x = e || window.event;
            var key = (x.keyCode || x.which);
            switch (key) {
                // 188 comma, 186 semi-colon
                case 186:
                    var style = placeHolder.siblings('.simply-tag-current').attr('data-type');
                    _appendSelectedData(settings, placeHolder, txtElement, style);
                    txtElement.val('');
                    break;
                case 40:
                case 38: //down/up arrow
                    _traverseSuggestionList(placeHolder, key);
                    break;
                case 27: //esc 
                    placeHolder.siblings('.simply-tag-suggestion-root').css('display', 'none');
                    break;
                default:
                    _processKeyPress(placeHolder, settings, $(this).val(), key);
                    txtElement.attr('size', txtElement.val().length + 1); //increase size
                    break;
            }
        });

        //restrict special char
        if (!settings.allowSpecialChar) {
            placeHolder.parent().find('#txt-input').on("keypress", function () {
                var redExp = new RegExp("[a-zA-Z0-9- ;]");
                var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
                if (!redExp.test(key)) {
                    return false;
                }
                return true;
            });
        }

        placeHolder.parent().on('click', function () {
            $(this).find('#txt-input').focus();
        });

        $(document).mouseup(function (e) {
            var container = $(".simply-tag-suggestion-root");
            if (!container.is(e.target) // if the target of the click isn't the container...
                && container.has(e.target).length === 0) // ... nor a descendant of the container
            {
                container.hide();
            }
        });
    }
    var _traverseSuggestionList = function (placeHolder, keyCode) {
        var currentSelection = placeHolder.siblings('.simply-tag-suggestion-root').find('.simply-tag-suggestion.tag-selectable');
        if (currentSelection.length == 0) {
            placeHolder.siblings('.simply-tag-suggestion-root').find('.simply-tag-suggestion').first().addClass("tag-selectable");
        } else {
            currentSelection.removeClass('tag-selectable');
            if (keyCode == 40) //down
            {
                if (currentSelection.next().length == 0)
                    placeHolder.siblings('.simply-tag-suggestion-root').find('.simply-tag-suggestion').first().addClass("tag-selectable");
                else
                    currentSelection.next().addClass("tag-selectable");
            }

            else if (keyCode == 38)
                currentSelection.prev().addClass("tag-selectable");
        }
    }
    var _appendSelectedData = function (settings, placeHolder, txtBox, cssStyle) {
        var value = txtBox.val();
        value = value.replace(';', ''); //senetise values
        if (value.length === 0)
            return false;

        //if cssStyle is invlaid, check if the entered data is valid
        if (cssStyle === 'invalid')
            cssStyle = _resolveAndGetInputStatusForRendomText(settings, placeHolder, value);

        if (!settings.forMultiple)
            placeHolder.siblings('span.simply-tags').empty();

        var key = txtBox.data('key');
        _addItemTotagList(placeHolder, key, value, cssStyle);
        return true;
    };

    var _addItemTotagList = function (placeHolder, key, value, cssStyle) {

        var existingValue = placeHolder.parent().find(".tag[data-key='" + key + "']");
        //add if not exist
        if (existingValue.length === 0) {
            var disabled = cssStyle == 'invalid' ? 'disabled' : '';
            placeHolder.siblings('span.simply-tags').append("<span data-key='" + key + "' data-display='" + value + "' class='tag label label-info " + cssStyle + "'>"
                + value +
                "<span data-role='remove' title='Remove'></span></span>");
            placeHolder.parent().find(".tag [data-role='remove']").on('click', function () {
                $(this).parent().remove();
            });
        } else {
            existingValue.fadeIn(200).fadeOut(200).fadeIn(200);
        }

        placeHolder.siblings('.simply-tag-suggestion-root').css('display', 'none');
        placeHolder.siblings('#txt-input').data('key', '');

    };

    var _processKeyPress = function (placeHolder, settings, text, keyCode) {
        var param;
        placeHolder.siblings('.simply-tag-suggestion-root').css('display', 'none');
        placeHolder.siblings('.simply-tag-current').attr('data-type', 'invalid');
        if (keyCode == 13) {
            _insertValueFromSuggestionOnEnter(placeHolder);
            return true;
        }
        _displaySuggestions(placeHolder, settings, text);
    }
    var _resolveAndGetInputStatusForRendomText = function (settings, placeHolder, input) {
        var retVal = 'invalid';
        placeHolder.siblings('#txt-input').data("key", input);
        if (settings.dataSource != null && settings.dataSource.length != 0) {

            $.each(settings.dataSource, function (index, dataSource) {
                if (dataSource[settings.value].toLowerCase() === input.toLowerCase()) {
                    retVal = 'valid';
                    placeHolder.siblings('#txt-input').data("key", dataSource[settings.key]);
                    return true;
                }
            });
        }
        return retVal;
    }

    //#endregion Events

    //#region Suggestion Region
    var _displaySuggestions = function (placeHolder, settings, text) {
        //_showSpinner(placeHolder);
        placeHolder.siblings('.simply-tag-current').attr('data-type', 'invalid');
        var suggestionHtml = " <div class='simply-tag-dataset'>";
        var matchCount = 0;
        if (settings.dataSource.length != 0) {
            $.each(settings.dataSource, function (index, dataSource) {
                if (dataSource[settings.value].toLowerCase().includes(text.toLowerCase())) {
                    matchCount += 1;
                    suggestionHtml += " <div class='simply-tag-suggestion' data-value='" + dataSource[settings.value] + "' data-key='" + dataSource[settings.key] + "' >" + dataSource[settings.value] + "</div>";
                }

            });
            suggestionHtml += " </div>";
            if (matchCount > 0)
                placeHolder.siblings('.simply-tag-suggestion-root').empty().css('display', 'block').append(suggestionHtml);
            var currentInputPosition = placeHolder.siblings('#txt-input').offset();
            currentInputPosition.left = _setLeftCordinatesForSuggestion(currentInputPosition, placeHolder);
            placeHolder.siblings('.simply-tag-suggestion-root').offset({ left: currentInputPosition.left, top: currentInputPosition.top + 20 });
            placeHolder.siblings('.simply-tag-suggestion-root').find('.simply-tag-suggestion').on('click', function () {
                _insertValueFromSuggestionOnClick(placeHolder, $(this));
            });
        }
        //_hideSpinner(placeHolder);
    }
    var _setLeftCordinatesForSuggestion = function (currentInputPosition, placeHolder) {
        var windowWidth = $(window).width();
        if (windowWidth - currentInputPosition.left < placeHolder.siblings('.simply-tag-suggestion-root').width())
            return windowWidth - (placeHolder.siblings('.simply-tag-suggestion-root').width() + 10);
        else
            return currentInputPosition.left;
    }
    var _insertValueFromSuggestionOnClick = function (placeHolder, suggestionElement) {
        _addItemTotagList(placeHolder, suggestionElement.attr('data-key'), suggestionElement.attr('data-value'), 'valid');
        placeHolder.siblings('#txt-input').val("");
    }
    var _insertValueFromSuggestionOnEnter = function (placeHolder) {
        var suggestionElement = placeHolder.siblings('.simply-tag-suggestion-root').find('.simply-tag-suggestion.tag-selectable');
        if (suggestionElement.length !== 0)
            _insertValueFromSuggestionOnClick(placeHolder, suggestionElement);
    }
    //#endregion Suggestion Region

}(jQuery);

jQuery(document).ready(function($) {
    var itemsContainer = $('#ua-player-items');
    var hiddenInput = $('#ua_player_saved_json');
    var playlist = uaPlayerAdminData.playlist || [];

    function renderItems() {
        itemsContainer.empty();
        playlist.forEach(function(item, index) {
            // Create row without draggable attribute on whole div
            var row = $('<div class="ua-player-item">').attr('data-index', index);

            // Create drag handle with grab cursor and icon
            var dragHandle = $('<div class="drag-handle" title="Drag to reorder" style="cursor: grab; display: inline-block; padding: 0 10px; user-select: none;">&#9776;</div>');
            dragHandle.attr('draggable', 'true');
            row.append(dragHandle);

            var imgField = $('<input>', {
                type: 'hidden',
                class: 'ua-image-field',
                value: item.image || ''
            });

            var imgPreview = $('<img>', {
                src: item.image || '',
                class: 'ua-image-preview',
                css: { width: '60px', height: '60px', objectFit: 'cover', marginLeft: '10px', display: item.image ? 'inline-block' : 'none' }
            });

            var imgBtn = $('<button>', { type: 'button', class: 'button ua-upload-btn', title: 'Upload Image' })
                .append('<span class="dashicons dashicons-format-image"></span>')
                .on('click', function(e) {
                    e.preventDefault();
                    var frame = wp.media({ title: 'Select Image', multiple: false, library: { type: 'image' } });
                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        imgField.val(attachment.url);
                        imgPreview.attr('src', attachment.url).show();
                        updateJSON();
                    });
                    frame.open();
                });

            var titleField = $('<input>', {
                type: 'text',
                class: 'ua-title-field regular-text',
                value: item.title || '',
                placeholder: 'Title'
            });

            var subtitleField = $('<input>', {
                type: 'text',
                class: 'ua-subtitle-field regular-text',
                value: item.subtitle || '',
                placeholder: 'Subtitle / Artist'
            });

            var audioField = $('<input>', {
                type: 'text',
                class: 'ua-audio-field regular-text',
                value: item.audio || '',
                placeholder: 'Audio URL'
            });

            var audioBtn = $('<button>', { type: 'button', class: 'button ua-upload-btn', title: 'Upload Audio' })
                .append('<span class="dashicons dashicons-format-audio"></span>')
                .on('click', function(e) {
                    e.preventDefault();
                    var frame = wp.media({ title: 'Select Audio', multiple: false, library: { type: 'audio' } });
                    frame.on('select', function() {
                        var attachment = frame.state().get('selection').first().toJSON();
                        audioField.val(attachment.url);
                        updateJSON();
                    });
                    frame.open();
                });

            var removeBtn = $('<button>', { type: 'button', class: 'button button-secondary ua-remove-btn', title: 'Remove Item' })
                .append('<span class="dashicons dashicons-no"></span>')
                .on('click', function() {
                    var currentIndex = parseInt(row.attr('data-index'), 10);
                    if (!isNaN(currentIndex)) {
                        playlist.splice(currentIndex, 1);
                        updateJSON();
                        renderItems();
                    }
                });

            var imgRow = $('<div class="ua-field-row">')
                .append('<label>Image:</label>')
                .append(imgBtn)
                .append(imgField)
                .append(imgPreview);

            row.append(imgRow).append('<br>');
            row.append('<label>Title:</label>').append(titleField).append('<br>');
            row.append('<label>Subtitle:</label>').append(subtitleField).append('<br>');
            row.append('<label>Audio:</label>').append(audioField).append(audioBtn).append('<br>');
            row.append(removeBtn);

            itemsContainer.append(row);
        });
    }

    function updateJSON() {
        var newData = [];
        itemsContainer.find('.ua-player-item').each(function() {
            var row = $(this);
            newData.push({
                image: row.find('.ua-image-field').val(),
                title: row.find('.ua-title-field').val(),
                subtitle: row.find('.ua-subtitle-field').val(),
                audio: row.find('.ua-audio-field').val()
            });
        });
        hiddenInput.val(JSON.stringify(newData));
    }

    $('#ua-add-row').on('click', function(e) {
        e.preventDefault();
        playlist.push({ image: '', title: '', subtitle: '', audio: '' });
        renderItems();
        updateJSON();
        return false;
    });

    itemsContainer.on('change input', 'input', updateJSON);

    // DRAG & DROP with handle only
    var draggedEl = null;

    itemsContainer.on('dragstart', '.drag-handle', function(e) {
        draggedEl = $(this).closest('.ua-player-item')[0];
        e.originalEvent.dataTransfer.effectAllowed = 'move';
        $(draggedEl).css('opacity', '0.5');
    });

    itemsContainer.on('dragend', '.drag-handle', function(e) {
        if (!draggedEl) return;
        $(draggedEl).css('opacity', '1');
        draggedEl = null;
        updateOrder();
    });

    itemsContainer.on('dragover', '.ua-player-item', function(e) {
        e.preventDefault();
        e.originalEvent.dataTransfer.dropEffect = 'move';

        if (!draggedEl || draggedEl === this) return;

        var $dragged = $(draggedEl);
        var $target = $(this);

        var targetOffset = $target.offset();
        var targetHeight = $target.outerHeight();
        var mouseY = e.originalEvent.clientY;

        if (mouseY - targetOffset.top < targetHeight / 2) {
            $target.before($dragged);
        } else {
            $target.after($dragged);
        }
    });

    function updateOrder() {
        var newPlaylist = [];
        itemsContainer.children('.ua-player-item').each(function() {
            var row = $(this);
            newPlaylist.push({
                image: row.find('.ua-image-field').val(),
                title: row.find('.ua-title-field').val(),
                subtitle: row.find('.ua-subtitle-field').val(),
                audio: row.find('.ua-audio-field').val()
            });
        });
        playlist = newPlaylist;
        updateJSON();
        renderItems(); // re-render to update indexes & UI
    }

    renderItems();
});

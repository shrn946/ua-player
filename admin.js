jQuery(document).ready(function($) {
    var itemsContainer = $('#ua-player-items');
    var hiddenInput = $('#ua_player_saved_json');
    var playlist = uaPlayerAdminData.playlist || [];

    function renderItems() {
        itemsContainer.empty();
        playlist.forEach(function(item, index) {
            var row = $('<div class="ua-player-item">').attr('data-index', index); // assign current index here

            // Hidden field for image URL
            var imgField = $('<input>', {
                type: 'hidden',
                class: 'ua-image-field',
                value: item.image || ''
            });

            // Thumbnail preview
            var imgPreview = $('<img>', {
                src: item.image || '',
                class: 'ua-image-preview',
                css: { width: '60px', height: '60px', objectFit: 'cover', marginLeft: '10px', display: item.image ? 'inline-block' : 'none' }
            });

            // Upload button
            var imgBtn = $('<button>', { type: 'button', text: 'Upload Image', class: 'button' })
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

            // Title
            var titleField = $('<input>', {
                type: 'text',
                class: 'ua-title-field regular-text',
                value: item.title || '',
                placeholder: 'Title'
            });

            // Subtitle
            var subtitleField = $('<input>', {
                type: 'text',
                class: 'ua-subtitle-field regular-text',
                value: item.subtitle || '',
                placeholder: 'Subtitle / Artist'
            });

            // Audio
            var audioField = $('<input>', {
                type: 'text',
                class: 'ua-audio-field regular-text',
                value: item.audio || '',
                placeholder: 'Audio URL'
            });

            var audioBtn = $('<button>', { type: 'button', text: 'Upload Audio', class: 'button' })
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

            // Remove button (use data-index attribute for current index)
            var removeBtn = $('<button>', { type: 'button', text: 'Remove', class: 'button button-secondary' })
                .on('click', function() {
                    var currentIndex = parseInt(row.attr('data-index'), 10);
                    if (!isNaN(currentIndex)) {
                        playlist.splice(currentIndex, 1);
                        updateJSON();
                        renderItems();
                    }
                });

            // Append fields
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
        e.preventDefault(); // prevent form submission or page reload
        playlist.push({ image: '', title: '', subtitle: '', audio: '' });
        renderItems();
        updateJSON();
        return false; // stop bubbling
    });

    itemsContainer.on('change input', 'input', updateJSON);

    renderItems();
});

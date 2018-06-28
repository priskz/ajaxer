(function(window)
{
  // External API && Default Config
  window.Ajaxer = {
    provides: 'ajaxer',
    notify: notify,
    config: {
      library: 'jQuery',
      attribute: {
        method:        'data-method',
        endpoint:      'data-endpoint',
        service:       'data-service',
        functionCall:  'data-function',
        argument:      'data-argument',
        action:        'data-click-type',
        action_target: 'data-submit-target'
      },
      legacy_support: [],
      transfer: {
        request: {
          type: 'application/x-www-form-urlencoded; charset=UTF-8'
        },
        response: {
          type: 'json'
        }
      },
      handler: {
        type: 'code'
      }
    },
    library: {
      'default':{
        init: function(data){ console.log('Ajaxer utility service library not yet implemented.'); }
      },
      jQuery: {
        init: initJQuery,
        config: {
          directive: {
            click: { selector: '.ajaxer-click'}
          }
        }
      }
    },
    service: {
      notifier: {
          success: function(data){ console.log('success: ' + data); },
          error:   function(data){ console.log('error: ' + data); },
          warning: function(data){ console.log('warning: ' + data); },
          info:    function(data){ console.info('info: ' + data); }
      }
    }
  };

  // Set self reference.
  var self = this.Ajaxer;

  // Initialize
  init();

  // Initialize
  function init(config)
  {
    // Override Utitily Config
    if(typeof config !== 'undefined')
    {
      // @todo: Iterate config object and replace all provided values.
      self.config = config;
    }

    if(self.config.library !== 'default' && typeof(window[self.config.library]) === 'undefined')
    {
      // Print to console if library is not yet available.
      self.notify(self.config.library + ' is not available.', 'warning');

      // Set the default library as a fall back.
      self.config.library = 'default';
    }
    else
    {
      // Check if the configured library has an init method. Execute if it does.
      if(typeof self.library[self.config.library].init !== 'undefined')
      {
        self.library[self.config.library].init();
      }
    }
  }

  // jQuery Library init() function implementation.
  function initJQuery()
  {
    // AJAX Click Directive Initialization
    $(document).on('click', self.library[self.config.library].config.directive.click.selector, function(event)
    {
      // Prevent the link from routing normally.
      event.preventDefault();
      event.stopImmediatePropagation();

      // Make AJAX Configuration
      $.ajax(parseConfig(this, event));
    });
  }

  // Parse all ajax configuration values.
  function parseConfig(context, event)
  {
    var config = {
      type:        parseType(context),
      url:         parseEndpoint(context),
      data:        parseData(context),
      dataType:    parseDataType(context),
      contentType: parseContentType(context),
      processData: parseProcessData(context),
      cache:       false,
      success: function(data)
      {
        handle('success', data, event);
      },
      error: function(data)
      {
        handle('error', data, event);
      },
      complete: function(data)
      {
        // @todo: Implement if/when needed.
      }
    };

    // If the data is FormData at this point it means that there is file
    // input, so we'll adjust the AJAX configuration to accommodate.
    if(config.data instanceof FormData)
    {
      // @todo: Unable to make PUT requests handle files, look for fix. Use POST.

      // False value will be defualt of: application/x-www-form-urlencoded; charset=UTF-8
      config.contentType = false;
     }

    return config;
  }

  // Parse the reponse's return data type.
  function parseDataType(context)
  {
    // @todo: Not yet fully implemented.
    return self.config.transfer.response.type;
  }

  // Parse the outgoing request data type.
  function parseContentType(context)
  {
    // @todo: Not yet fully implemented.
    return self.config.transfer.request.type;
  }

  // Parse the ajax's process data property.
  function parseProcessData(context)
  {
    switch(self.config.transfer.request.type)
    {
      case 'application/json':
        return false;
      break;

      default:
        return true;
      break;
    }
  }

  // Parse the outgoing request data from the given context.
  function parseData(context)
  {
    // Init request data.
    var requestData = {};

    // Handle a submit "click-type" if specified - For submitting a form with input.
    if($(context).attr(self.config.attribute.action) == 'submit')
    {
      // By default we'll assume the form itself holds the Ajax data attribute values.
      var form = $(context)[0];

      // If a submit-target it specified, the item clicked is to submit that targeted form.
      if($(context).attr(self.config.attribute.action_target))
      {
        form = $($(context).attr(self.config.attribute.action_target))[0];
      }

      // We only want to gather form data if a form is provided.
      if(form instanceof HTMLFormElement)
      {
        // If we do not have to support any legacy browsers, lets see if the submitted form has files to send.
        if(self.config.legacy_support.indexOf('IE8') == -1 && self.config.legacy_support.indexOf('IE9') == -1)
        {
          // Take all of the form inputs, look for file, and reduce to boolean.
          var fileInputExists = [$(form).find(":input")].reduce(function(obj, item)
          {
            fileInput = false;

            item.each(function(index, context)
            {
              if($(context).attr('type') == 'file')
              {
                fileInput = true;
              }
            });

            return fileInput;
          }, {});

          // If file input exists, utilize FormData to send it easily.
          if(fileInputExists)
          {
            requestData = new FormData(form);
          }
        }

        // If requestData is not a FormData object, transform data object into a json string.
        if(requestData instanceof FormData === false)
        {
          // Collect form data, will not get files due to IE8.
          var formData = $(form).serializeArray();

          for (var i = 0, c = formData.length; i < c; i++)
          {
            requestData[formData[i].name] = formData[i].value;
          }

          // Stringify data if request type is JSON.
          switch(self.config.transfer.request.type)
          {
            case 'application/json':
              // Stringify the requestData object.
              requestData = JSON.stringify(requestData);
            break;

            default:
              // NA
            break;
          }
        }
      }
      else
      {
        // Print to console if library is not yet available.
        self.notify('Unable to collect form data on non-form element(s).', 'error');
      }
    }

    return requestData;
  }

  // Parse the request endpoint from the context.
  function parseEndpoint(context)
  {
    var context = $(context).attr(self.config.attribute.endpoint);

    // Replace endpoint placeholder variables with set global variables.
    for (var variable in GLOBAL_VAR)
    {
      context = context.replace('{{' + variable + '}}', GLOBAL_VAR[variable]);
    }

    return context;
  }

  // Parse the request type from the context.
  function parseType(context)
  {
    // Set the default ajax method type.
    var type = $(context).attr(self.config.attribute.method) ? $(context).attr(self.config.attribute.method) : 'POST';

    // Add a simple confirmaton if any DELETE request is made.
    if(type == 'DELETE')
    {
        // Confirm Prompt
        confirmed = confirm("Are you sure you want to delete this?");

        // Stop and do nothing else if not confirmed.
        if(confirmed === false)
        {
          return;
        }
    }

    return type;
  }

  // Handle the response received from server.
  function handle(type, data, event)
  {
    switch(self.config.handler.type)
    {
      case 'payload':
        switch(type)
        {
          case 'success':
            handlePayload({ event: event, status: data.status, data: data.data });
          break;

          default:
            console.log('Unexpected response from server.');
        }
      break;

      case 'code':
        handleResponse(type, data, event);
      break;

      default:
        self.notify('Ajax handler type not configured.', 'error');
    }
  }

  // Handle the response received from server.
  function handleResponse(type, data, event)
  {
    // Gather & standardize response data.
    response = {
      type:     type,
      result:   data,
      event:    event,
      argument: $(event.currentTarget).attr(self.config.attribute.argument)
    };

    // Make sure service exists.
    if(typeof (window[$(response.event.currentTarget).attr(self.config.attribute.service)]) !== 'undefined')
    {
      switch(typeof window[$(response.event.currentTarget).attr(self.config.attribute.service)][$(response.event.currentTarget).attr(self.config.attribute.functionCall)])
      {
        case 'function':
          // Call the service method with resulting payload.
          window[$(response.event.currentTarget).attr(self.config.attribute.service)][$(response.event.currentTarget).attr(self.config.attribute.functionCall)](response);
        break;

        default:
        console.log($(response.event.currentTarget).attr(self.config.attribute.service) + '.' + $(response.event.currentTarget).attr(self.config.attribute.functionCall) + ' does not yet exist!');
      }
    }
    else
    {
      // Display/Print notification
      self.notify(response, response.type);
    }
  }

  // Handle a Payload response front server.
  function handlePayload(payload)
  {
    // If a service is not given, then display/print a notification.
    if(typeof (window[$(payload.event.currentTarget).attr(self.config.attribute.service)]) !== 'undefined')
    {
      switch(typeof window[$(payload.event.currentTarget).attr(self.config.attribute.service)][$(payload.event.currentTarget).attr(self.config.attribute.functionCall)])
      {
        case 'function':
          // Call the service method with resulting payload.
          window[$(payload.event.currentTarget).attr(self.config.attribute.service)][$(payload.event.currentTarget).attr(self.config.attribute.functionCall)](payload);
        break;

        default:
        console.log($(payload.event.currentTarget).attr(self.config.attribute.service) + '.' + $(payload.event.currentTarget).attr(self.config.attribute.functionCall) + ' does not yet exist!');
      }
    }
    else
    {
      // Determine notification type.
      switch(payload.status)
      {
        case 'invalid':
          notificationType = 'error';
        break;

        default:
          notificationType = 'success';
      }

      // Display/Print notification
      self.notify(payload.status, notificationType);
    }
  }

  // Display/Print Notification Message
  function notify(data, functionName)
  {
    functionName = (typeof functionName !== 'undefined') ? functionName : 'info';

    // Since payloads have a more predictable makeup, display/print a notification of what happened.
    if(typeof window['Notifier'] !== 'undefined')
    {
      window['Notifier'].notify(data, functionName);
    }
    else
    {
      self.service.notifier[functionName](data);
    }
  }

  // @todo: Currently not utilized.
  // @todo: Add to external API when implemented.
  // Load an external service(s).
  function load(service)
  {
    if(Array.isArray(service))
    {
      for(var i = 0; i < service.length; i++)
      {
        self.service[service[i].provides] = service[i];
      }
    }
    else
    {
      self.service[service.provides] = service;
    }
  }

  // @todo: Currently not utilized.
  // @todo: Add to external API when implemented.
  function ajax()
  {
    console.log('Generic Ajaxer.ajax() function not yet implemented.')
  }

})(window);

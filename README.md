mls-expansion-draft
===

## Example

*used on [RSL Soapbox](http://www.rslsoapbox.com/2014/11/17/7233177/your-say-who-should-real-salt-lake-protect-in-the-2014-expansion-draft), jQuery already available*

```html
https://s3-us-west-2.amazonaws.com/mmontgomery/expansion-draft.js
<form id="draft-picker-container">
<div class="message"></div>
<div class="form"></div>
<div class="results"></div>
<input type="submit" /> </form>
<p>
<script src="https://s3-us-west-2.amazonaws.com/mmontgomery/expansion-draft.js" type="text/javascript"></script>
<script type="text/javascript"><!--
var draft = new Draft('#draft-picker-container', 'rsl');
// --></script>
<style>
            #draft-picker-container {
                max-width: 300px;
            }
            #draft-picker-container .message:empty {
                display: none;
            }
            #draft-picker-container .message.error {
                background: #aa3344;
                color: white;
                padding: 1rem 2rem;
                text-align: center;
            }
            #draft-picker-container .message.success {
                background: #44aa33;
                color: white;
                padding: 1rem 2rem;
                text-align: center;
            }
            #draft-picker-container .line-item .player-item {
                display: block;
                font-size: 11pt;
                font-weight: 200;
                padding: .5rem;
                border: 1px solid #ccc;
                margin: .5rem 0;
                width: 100%;
                max-width: 300px;

            }
            #draft-picker-container input[type="submit"] {
                background: #528CE0;
                color: white;
                border: 0;
                padding: 1rem 2rem;
                font-family: 'Helvetica Neue', 'Arial';
                font-size: 11pt;
                text-transform: uppercase;
            }
#draft-picker-container input[type="submit"]:disabled {
  background: #cccccc;
}
        </style>

```


## Expected POST data

```json
{
    "team": "rsl",
    "list": [
        "Beckerman",
        "Rimando"
    ]
}
```

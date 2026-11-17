# Saturn texture attribution

The Saturn Home scene loads two original Solar System Scope texture maps through
commit-pinned jsDelivr URLs. The texture files are not modified by The Choco Studios.

## Surface map

- Source asset: 2k_saturn.jpg
- Source: https://www.solarsystemscope.com/textures/
- Original download: https://www.solarsystemscope.com/textures/download/2k_saturn.jpg
- Format: 2048 × 1024 JPEG, equirectangular surface/albedo map
- Author: Solar System Scope
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License URL: https://creativecommons.org/licenses/by/4.0/
- Runtime mirror: RTF22/Orrery, assets-quellen/texturen/saturn/albedo.jpg
- Runtime asset commit: 6c81feb760cb36d7d83d1421aef257833ba9768e

## Ring colour and alpha map

- Source asset: 2k_saturn_ring_alpha.png
- Source: https://www.solarsystemscope.com/textures/
- Original download: https://www.solarsystemscope.com/textures/download/2k_saturn_ring_alpha.png
- Format: 2048 × 125 PNG, radial colour/alpha strip
- Author: Solar System Scope
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License URL: https://creativecommons.org/licenses/by/4.0/
- Runtime mirror: RTF22/Orrery, public/textures/saturn/ring.png
- Runtime asset commit: 6c81feb760cb36d7d83d1421aef257833ba9768e

The two texture files are served through jsDelivr at URLs pinned to the commit above.
jsDelivr supports cross-origin asset delivery. U maps from the inner to outer ring
radius and V samples the centre of the source strip, preserving the radial bands
and Cassini Division around the full circumference.

Solar System Scope states that its planet maps are based on NASA elevation and
imaging data, colour-matched to spacecraft and telescope imagery. These are visual
texture assets, not a raw Cassini instrument image or a scientific measurement map.

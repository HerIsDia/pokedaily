<script lang="ts">
  import type { AppData } from '../scripts/script';
  export let data: AppData;
  const allPokemonFounds = data.pokedex;
  let pokemons: number[] = [];
  for (let index = 0; index < 1025; index++) {
    pokemons.push(index + 1);
  }

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const userLang: 'fr' | 'en' =
    (urlParams.get('lang') || navigator.language.slice(0, 2)) == 'fr'
      ? 'fr'
      : 'en';

  const text = {
    fr: `Vous avez été ${allPokemonFounds.length} Pokémon.`,
    en: `You've been ${allPokemonFounds.length} Pokémon.`,
  };
</script>

<h1>{text[userLang]}</h1>
<div class="pokemons">
  {#each pokemons as id}
    <img
      class={allPokemonFounds.includes(id) ? 'found' : ''}
      src="./images/{id < 100 ? (id < 10 ? `00${id}` : `0${id}`) : `${id}`}.png"
      alt={id.toString()}
      id={id.toString()}
    />
  {/each}
</div>

<style lang="scss">
  h1 {
    text-align: center;
    margin-bottom: 50px;
  }
  .pokemons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    img {
      width: 100px;
      &:not(.found) {
        filter: grayscale(1) blur(5px) opacity(0.3);
      }
    }
  }
</style>

<script setup>
import {ref} from  'vue'
import banner from'./banner.vue'
import recommendlist from './recommend-list.vue'
</script>

<template>
    <div class="recommend">
    <div class="r-left">
    <recommendlist />
    </div>
    <div class="r-right">
    <banner />
    </div>
    </div>
</template>
<style scoped>

</style>